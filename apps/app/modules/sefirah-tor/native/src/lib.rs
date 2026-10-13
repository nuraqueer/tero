//! Development Tor transport. No clearnet target, SOCKS listener, or Cloudflare path.
use anyhow::{Context, Result, anyhow, bail};
use arti_client::{TorClient, config::TorClientConfigBuilder};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use futures::{
    StreamExt,
    future::{AbortHandle, Abortable},
    io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt},
};
use safelog::DisplayRedacted;
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    sync::{Arc, LazyLock, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use subtle::ConstantTimeEq;
use tokio::{
    runtime::{Builder, Runtime},
    sync::Semaphore,
    task::JoinSet,
};
use tor_cell::relaycell::msg::Connected;
use tor_proto::stream::IncomingStreamRequest;
use tor_rtcompat::PreferredRuntime;

uniffi::setup_scaffolding!();

/// Swift uses generated UniFFI bindings for the same bounded, sanitized JSON ABI as JNI.
#[uniffi::export]
pub fn sefirah_tor_call(input: String) -> String {
    call(&input)
}

const FRAME_LIMIT: usize = 70 * 1024;
const OBJECT_LIMIT: usize = 64 * 1024;
const STORE_LIMIT: usize = 512 * 1024;
static RUNTIME: LazyLock<Runtime> = LazyLock::new(|| {
    // Dependencies enable both providers, so Rustls cannot infer one from features.
    // Initialization happens once, before Arti constructs its TLS connector.
    let _ = rustls::crypto::ring::default_provider().install_default();
    Builder::new_multi_thread()
        .worker_threads(2)
        .enable_all()
        .build()
        .expect("Tor runtime")
});
static CANCELLED: LazyLock<Mutex<HashSet<String>>> = LazyLock::new(|| Mutex::new(HashSet::new()));
static NODES: LazyLock<Mutex<HashMap<String, Arc<Node>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static JOBS: LazyLock<Mutex<HashMap<String, (String, AbortHandle)>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

struct Node {
    client: Arc<TorClient<PreferredRuntime>>,
    // Keeping this handle alive keeps the service running.
    _service: Arc<tor_hsservice::RunningOnionService>,
    offered: Arc<Mutex<HashMap<String, Value>>>,
    server: tokio::task::JoinHandle<()>,
}
impl Drop for Node {
    fn drop(&mut self) {
        self.server.abort();
    }
}

#[derive(Deserialize)]
#[serde(tag = "op", rename_all = "snake_case", deny_unknown_fields)]
enum Command {
    Start {
        handle: String,
        request: String,
        directory: String,
        capability: String,
    },
    Stop {
        handle: String,
    },
    Cancel {
        request: String,
    },
    Offer {
        handle: String,
        object: Value,
    },
    Forget {
        handle: String,
        id: String,
    },
    Get {
        handle: String,
        request: String,
        onion: String,
        capability: String,
        id: String,
    },
}
fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
fn token(s: &str, length: usize) -> bool {
    s.len() == length
        && s.bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
}
fn onion(s: &str) -> bool {
    s.strip_suffix(".onion").is_some_and(|host| {
        host.len() == 56
            && host
                .bytes()
                .all(|c| c.is_ascii_lowercase() || (b'2'..=b'7').contains(&c))
    })
}
fn validate_object(v: &Value) -> Result<(String, u64)> {
    let obj = v.as_object().context("object shape")?;
    let id = v["id"].as_str().context("object id")?;
    let box_text = v["box"].as_str().context("object box")?;
    let expiry = v["expiresAt"].as_u64().context("object expiry")?;
    if obj.len() != 4
        || v["version"] != 1
        || !token(id, 43)
        || box_text.len() > OBJECT_LIMIT
        || expiry <= now()
        || expiry > 9_007_199_254_740_991
    {
        bail!("invalid object");
    }
    let bytes = URL_SAFE_NO_PAD.decode(box_text)?;
    if bytes.len() < 1064
        || (bytes.len() - 40) % 1024 != 0
        || URL_SAFE_NO_PAD.encode(&bytes) != box_text
    {
        bail!("invalid box");
    }
    let encoded = serde_json::to_vec(&json!(["sefirah-object/v1", expiry, box_text]))?;
    if URL_SAFE_NO_PAD.encode(Sha256::digest(encoded)) != id {
        bail!("object hash");
    }
    Ok((id.to_owned(), expiry))
}
async fn read_frame<S: AsyncRead + Unpin>(stream: &mut S) -> Result<Value> {
    let mut prefix = [0u8; 4];
    stream.read_exact(&mut prefix).await?;
    let length = u32::from_be_bytes(prefix) as usize;
    if length == 0 || length > FRAME_LIMIT {
        bail!("frame size");
    }
    let mut bytes = vec![0u8; length];
    stream.read_exact(&mut bytes).await?;
    Ok(serde_json::from_slice(&bytes)?)
}
async fn write_frame<S: AsyncWrite + Unpin>(stream: &mut S, value: &Value) -> Result<()> {
    let bytes = serde_json::to_vec(value)?;
    if bytes.len() > FRAME_LIMIT {
        bail!("frame size");
    }
    stream
        .write_all(&(bytes.len() as u32).to_be_bytes())
        .await?;
    stream.write_all(&bytes).await?;
    stream.flush().await?;
    Ok(())
}
async fn start(handle: String, directory: String, capability: String) -> Result<Value> {
    if !token(&handle, 22) || !token(&capability, 43) {
        bail!("invalid session");
    }
    let root = PathBuf::from(directory);
    if !root.is_absolute() {
        bail!("absolute private directory required");
    }
    // Arti enforces private directory permissions. Never disable fs-mistrust checks.
    let config = TorClientConfigBuilder::from_directories(root.join("state"), root.join("cache"))
        .build()
        .context("tor_config")?;
    let client = TorClient::create_bootstrapped(config)
        .await
        .context("tor_bootstrap")?;
    let config = tor_hsservice::OnionServiceConfig::builder()
        .nickname("sefirah".parse()?)
        .build()
        .context("onion_config")?;
    let (service, rend_requests) = client
        .launch_onion_service(config)
        .context("onion_launch")?
        .context("onion service disabled")?;
    let address = service
        .onion_address()
        .context("onion address unavailable")?
        .display_unredacted()
        .to_string();
    let offered = Arc::new(Mutex::new(HashMap::<String, Value>::new()));
    let objects = offered.clone();
    let server = tokio::spawn(async move {
        // Bound active rendezvous handshakes before accepting application streams.
        let streams = rend_requests
            .map(|rend| async move { rend.accept().await.ok() })
            .buffer_unordered(4)
            .filter_map(|s| async move { s });
        let streams = Box::pin(streams).flatten_unordered(Some(4));
        futures::pin_mut!(streams);
        let permits = Arc::new(Semaphore::new(8));
        let mut connections = JoinSet::new();
        loop {
            tokio::select! {
                request = streams.next() => {
                    let Some(request) = request else { break };
                    let Ok(permit) = permits.clone().try_acquire_owned() else { drop(request); continue };
                    let objects = objects.clone();
                    let capability = capability.clone();
                    connections.spawn(async move {
                        let _permit = permit;
                        let _ = tokio::time::timeout(Duration::from_secs(30), async move {
                            if !matches!(request.request(), IncomingStreamRequest::Begin(b) if b.port() == 80) { return Ok::<(), anyhow::Error>(()); }
                            let mut stream = request.accept(Connected::new_empty()).await?;
                            let req = read_frame(&mut stream).await?;
                            let supplied = req["capability"].as_str().unwrap_or("");
                            if supplied.len() != capability.len() || !bool::from(supplied.as_bytes().ct_eq(capability.as_bytes())) { bail!("unauthorized"); }
                            if req.as_object().map(|o| o.len()) != Some(4) || req["v"] != 1 || req["op"] != "get" { bail!("invalid request"); }
                            let id = req["id"].as_str().filter(|s| token(s, 43)).context("invalid id")?;
                            let object = {
                                let mut store = objects.lock().map_err(|_| anyhow!("store lock"))?;
                                store.retain(|_, v| v["expiresAt"].as_u64().unwrap_or(0) > now());
                                store.get(id).cloned().unwrap_or(Value::Null)
                            };
                            write_frame(&mut stream, &json!({"v":1,"object":object})).await?;
                            stream.close().await?;
                            Ok(())
                        }).await;
                    });
                }
                _ = connections.join_next(), if !connections.is_empty() => {}
            }
        }
    });
    let node = Arc::new(Node {
        client,
        _service: service,
        offered,
        server,
    });
    let cancelled = CANCELLED.lock().map_err(|_| anyhow!("cancel lock"))?;
    if cancelled.contains(&handle) {
        bail!("session closed");
    }
    let mut nodes = NODES.lock().map_err(|_| anyhow!("node lock"))?;
    if nodes.contains_key(&handle) {
        bail!("session already started");
    }
    nodes.insert(handle, node);
    Ok(json!({"onion":address}))
}
fn node(handle: &str) -> Result<Arc<Node>> {
    NODES
        .lock()
        .map_err(|_| anyhow!("node lock"))?
        .get(handle)
        .cloned()
        .context("Tor session closed")
}
fn stop(handle: &str) {
    let mut cancelled = CANCELLED.lock().expect("cancel lock");
    cancelled.insert(handle.to_owned());
    if let Ok(mut jobs) = JOBS.lock() {
        jobs.retain(|_, (owner, job)| {
            if owner == handle {
                job.abort();
                false
            } else {
                true
            }
        });
    }
    if let Ok(mut nodes) = NODES.lock() {
        nodes.remove(handle);
    }
}
fn run_job(
    handle: String,
    id: String,
    future: impl std::future::Future<Output = Result<Value>>,
) -> Result<Value> {
    if !token(&id, 22) {
        bail!("invalid request id");
    }
    let (abort, registration) = AbortHandle::new_pair();
    {
        let cancelled = CANCELLED.lock().map_err(|_| anyhow!("cancel lock"))?;
        if cancelled.contains(&handle) || cancelled.contains(&id) || cancelled.len() >= 1024 {
            bail!("session cancelled");
        }
        let mut jobs = JOBS.lock().map_err(|_| anyhow!("job lock"))?;
        if jobs.len() >= 8 || jobs.contains_key(&id) {
            bail!("native request capacity");
        }
        jobs.insert(id.clone(), (handle, abort));
    }
    let result = RUNTIME.block_on(async {
        Abortable::new(
            tokio::time::timeout(Duration::from_secs(180), future),
            registration,
        )
        .await
    });
    if let Ok(mut jobs) = JOBS.lock() {
        jobs.remove(&id);
    }
    result
        .map_err(|_| anyhow!("cancelled"))?
        .map_err(|_| anyhow!("Tor deadline"))?
}
fn execute(command: Command) -> Result<Value> {
    match command {
        Command::Stop { handle } => {
            stop(&handle);
            Ok(json!({}))
        }
        Command::Cancel { request } => {
            if let Ok(mut cancelled) = CANCELLED.lock() {
                cancelled.insert(request.clone());
            }
            if let Ok(mut jobs) = JOBS.lock()
                && let Some((_, job)) = jobs.remove(&request)
            {
                job.abort();
            }
            Ok(json!({}))
        }
        Command::Start {
            handle,
            request,
            directory,
            capability,
        } => {
            if !NODES.lock().map_err(|_| anyhow!("node lock"))?.is_empty() {
                bail!("only one Tor session per app");
            }
            let result = run_job(
                handle.clone(),
                request,
                start(handle.clone(), directory, capability),
            );
            if result.is_err() {
                stop(&handle);
            }
            result
        }
        Command::Offer { handle, object } => {
            let (id, _) = validate_object(&object)?;
            let node = node(&handle)?;
            let mut store = node.offered.lock().map_err(|_| anyhow!("store lock"))?;
            store.retain(|_, v| v["expiresAt"].as_u64().unwrap_or(0) > now());
            if store.contains_key(&id) {
                return Ok(json!({}));
            }
            if store.len() >= 32
                || store.values().map(|v| v.to_string().len()).sum::<usize>()
                    + object.to_string().len()
                    > STORE_LIMIT
            {
                bail!("peer offer capacity");
            }
            store.insert(id, object);
            // Memory availability only: deliberately no durable storage receipt.
            Ok(json!({}))
        }
        Command::Forget { handle, id } => {
            if !token(&id, 43) {
                bail!("invalid object id");
            }
            let node = node(&handle)?;
            node.offered
                .lock()
                .map_err(|_| anyhow!("store lock"))?
                .remove(&id);
            Ok(json!({}))
        }
        Command::Get {
            handle,
            request,
            onion: address,
            capability,
            id,
        } => {
            if !onion(&address) || !token(&capability, 43) || !token(&id, 43) {
                bail!("invalid peer request");
            }
            let node = node(&handle)?;
            run_job(handle, request, async move {
                let mut stream = node
                    .client
                    .connect((address.as_str(), 80))
                    .await
                    .context("tor_connect")?;
                write_frame(
                    &mut stream,
                    &json!({"v":1,"op":"get","id":id,"capability":capability}),
                )
                .await?;
                let reply = read_frame(&mut stream).await?;
                if reply["v"] != 1 || reply.as_object().map(|o| o.len()) != Some(2) {
                    bail!("invalid peer response");
                }
                let object = &reply["object"];
                let (actual, _) = validate_object(object)?;
                if actual != id {
                    bail!("wrong object");
                }
                Ok(object.clone())
            })
        }
    }
}

/// JSON ABI returns only sanitized errors. Never send native paths or Tor errors to JS.
pub fn call(input: &str) -> String {
    if input.len() > FRAME_LIMIT {
        return json!({"ok":false,"error":"native_request_too_large"}).to_string();
    }
    let result = std::panic::catch_unwind(|| {
        serde_json::from_str::<Command>(input)
            .map_err(anyhow::Error::from)
            .and_then(execute)
    });
    match result {
        Ok(Ok(value)) => json!({"ok":true,"value":value}).to_string(),
        Ok(Err(error)) => {
            let code = match error.to_string().as_str() {
                "tor_config" => "tor_config_failed",
                "onion_config" => "tor_onion_config_failed",
                "onion_launch" | "onion service disabled" => "tor_onion_launch_failed",
                "onion address unavailable" => "tor_onion_identity_failed",
                "tor_bootstrap" => "tor_bootstrap_failed",
                "tor_connect" => "tor_peer_connection_failed",
                "cancelled" | "session cancelled" | "session closed" => "native_cancelled",
                "Tor deadline" => "native_timeout",
                _ => "native_transport_failed",
            };
            json!({"ok":false,"error":code}).to_string()
        }
        Err(_) => json!({"ok":false,"error":"native_transport_failed"}).to_string(),
    }
}

#[cfg(target_os = "android")]
#[unsafe(no_mangle)]
pub extern "system" fn Java_org_pherus_sefirah_SefirahTorModule_nativeCall(
    mut env: jni::JNIEnv,
    _class: jni::objects::JObject,
    input: jni::objects::JString,
) -> jni::sys::jstring {
    let result = match env.get_string(&input) {
        Ok(s) => call(&s.to_string_lossy()),
        Err(_) => json!({"ok":false,"error":"native_input_failed"}).to_string(),
    };
    env.new_string(result)
        .map(|s| s.into_raw())
        .unwrap_or(std::ptr::null_mut())
}

#[cfg(test)]
mod binding_tests {
    use super::*;

    #[test]
    fn ffi_rejects_oversized_and_malformed_input_without_exposing_it() {
        let marker = "PRIVATE_NATIVE_PATH_MUST_NOT_ESCAPE";
        let reply = sefirah_tor_call(marker.repeat(FRAME_LIMIT / marker.len() + 1));
        assert_eq!(
            serde_json::from_str::<Value>(&reply).unwrap(),
            json!({"ok": false, "error": "native_request_too_large"})
        );
        let reply = sefirah_tor_call(format!("{{not-json:{marker}}}"));
        assert_eq!(
            serde_json::from_str::<Value>(&reply).unwrap(),
            json!({"ok": false, "error": "native_transport_failed"})
        );
        assert!(!reply.contains(marker));
    }

    #[test]
    fn ffi_rejects_clearnet_targets_before_lookup_or_network() {
        let reply = sefirah_tor_call(
            json!({
                "op": "get", "handle": "unused", "request": "r".repeat(22),
                "onion": "127.0.0.1", "capability": "c".repeat(43), "id": "i".repeat(43)
            })
            .to_string(),
        );
        assert_eq!(
            serde_json::from_str::<Value>(&reply).unwrap(),
            json!({"ok": false, "error": "native_transport_failed"})
        );
    }

    #[test]
    fn ffi_stop_before_queued_start_prevents_bootstrap() {
        let handle = "cancelled-ffi-test-session";
        let stopped = sefirah_tor_call(json!({"op": "stop", "handle": handle}).to_string());
        assert_eq!(serde_json::from_str::<Value>(&stopped).unwrap()["ok"], true);
        let reply = sefirah_tor_call(
            json!({
                "op": "start", "handle": handle, "request": "s".repeat(22),
                "directory": "/invalid-path-must-never-be-created", "capability": "c".repeat(43)
            })
            .to_string(),
        );
        assert_eq!(
            serde_json::from_str::<Value>(&reply).unwrap(),
            json!({"ok": false, "error": "native_cancelled"})
        );
    }
}
