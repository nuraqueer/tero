use tauri::Manager;
mod chat_sessions;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeCapabilities {
    native: bool,
    identity_vault_ready: bool,
    peer_transport_ready: bool,
    cloud_fallback_enabled: bool,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct LegacyVaultInspection {
    format_version: u8,
    kdf_log2_n: u8,
    compatible_kdf: bool,
}

/// This is a read-only format check. It never unlocks, imports, persists, or
/// returns the encrypted record, salt, passcode or device-bound secret.
#[tauri::command]
fn inspect_legacy_vault(encoded: String) -> Result<LegacyVaultInspection, &'static str> {
    let header = sefirah_identity::inspect_legacy_vault(&encoded)
        .map_err(|_| "The legacy vault format is not recognised")?;
    Ok(LegacyVaultInspection {
        format_version: 1,
        kdf_log2_n: header.log2_n,
        compatible_kdf: (10..=15).contains(&header.log2_n) && header.r == 8 && header.p == 1,
    })
}

#[tauri::command]
fn runtime_capabilities() -> RuntimeCapabilities {
    RuntimeCapabilities {
        native: true,
        identity_vault_ready: false,
        peer_transport_ready: false,
        cloud_fallback_enabled: false,
    }
}

/// Invoke the existing Tor engine without exposing arbitrary filesystem paths.
/// Transport readiness remains false until authenticated physical-device tests.
#[tauri::command]
async fn sefirah_transport_call(
    app: tauri::AppHandle,
    request: serde_json::Value,
) -> Result<serde_json::Value, &'static str> {
    let mut request = request;
    let obj = request.as_object_mut().ok_or("Invalid transport request")?;
    let operation = obj.get("op").and_then(serde_json::Value::as_str)
        .ok_or("Invalid transport request")?;
    if !matches!(operation, "start" | "stop" | "cancel" | "offer" | "forget" | "get") {
        return Err("Unsupported transport operation");
    }
    if operation == "start" {
        let root = app.path().app_local_data_dir()
            .map_err(|_| "Private transport storage unavailable")?;
        let root = root.join("sefirah-tor");
        obj.insert("directory".to_owned(), serde_json::Value::String(root.to_string_lossy().into_owned()));
    } else if obj.contains_key("directory") {
        return Err("Unexpected transport directory");
    }
    let encoded = serde_json::to_string(&request).map_err(|_| "Invalid transport request")?;
    if encoded.len() > 70 * 1024 {
        return Err("Transport request too large");
    }
    let result = tauri::async_runtime::spawn_blocking(move || sefirah_tor::call(&encoded))
        .await.map_err(|_| "Transport operation failed")?;
    serde_json::from_str(&result).map_err(|_| "Invalid transport response")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(chat_sessions::ChatSessions::default())
        .invoke_handler(tauri::generate_handler![
            runtime_capabilities,
            inspect_legacy_vault,
            sefirah_transport_call,
            chat_sessions::chat_session_state,
            chat_sessions::chat_pending,
            chat_sessions::chat_received,
            chat_sessions::chat_key_package,
            chat_sessions::chat_initiate,
            chat_sessions::chat_join,
            chat_sessions::chat_encrypt,
            chat_sessions::chat_decrypt,
            chat_sessions::chat_close,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Tero");
}
