//! In-memory two-person OpenMLS foundation. Not connected to app transport yet.

use std::sync::{Arc, Mutex};

use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use ed25519_dalek::SigningKey;
use openmls::prelude::{tls_codec::*, *};
use openmls_basic_credential::SignatureKeyPair;
use openmls_rust_crypto::OpenMlsRustCrypto;
use serde::{Deserialize as SerdeDeserialize, Serialize as SerdeSerialize};
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;

mod delivery;
mod state;
use state::{Snapshot, StateStore};

uniffi::setup_scaffolding!();

const SUITE: Ciphersuite = Ciphersuite::MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;
const MAX_TEXT: usize = 4096;
const MAX_WIRE: usize = 65536;
// State is trusted by OpenMLS; review and migrate before changing this version.
const STATE_ENGINE_VERSION: &str = "openmls/0.9.1";

#[derive(Debug, thiserror::Error, uniffi::Error, PartialEq)]
pub enum ChatError {
    #[error("Invalid identity")]
    Identity,
    #[error("Unexpected conversation member")]
    Peer,
    #[error("Invalid conversation state")]
    State,
    #[error("Input exceeds the message limit")]
    Limit,
    #[error("Invalid or unauthenticated MLS message")]
    Message,
    #[error("Conversation is closed")]
    Closed,
    #[error("Message state could not be saved or verified")]
    Storage,
}

#[derive(Clone, Debug, SerdeSerialize, SerdeDeserialize, uniffi::Enum, PartialEq)]
pub enum PendingKind {
    KeyPackage,
    Welcome,
    Application,
    Control,
}

#[derive(Clone, Debug, uniffi::Enum, PartialEq)]
pub enum HandshakeState {
    Fresh,
    Offered,
    Established,
}

#[derive(Clone, Debug, SerdeSerialize, SerdeDeserialize, uniffi::Record, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct PendingMessage {
    pub id: String,
    pub kind: PendingKind,
    pub wire: Vec<u8>,
}

#[derive(Clone, Debug, SerdeSerialize, SerdeDeserialize, uniffi::Record, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ReceivedMessage {
    pub id: String,
    pub text: String,
}

fn wire_id(wire: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(wire))
}

fn did(public: &[u8]) -> String {
    let mut bytes = vec![0xed, 0x01];
    bytes.extend_from_slice(public);
    format!("did:key:z{}", bs58::encode(bytes).into_string())
}

fn public_from_did(identity: &str) -> Result<Vec<u8>, ChatError> {
    if identity.len() > 64 {
        return Err(ChatError::Identity);
    }
    let bytes = bs58::decode(
        identity
            .strip_prefix("did:key:z")
            .ok_or(ChatError::Identity)?,
    )
    .into_vec()
    .map_err(|_| ChatError::Identity)?;
    if bytes.len() != 34 || bytes[..2] != [0xed, 0x01] || did(&bytes[2..]) != identity {
        return Err(ChatError::Identity);
    }
    ed25519_dalek::VerifyingKey::from_bytes(
        bytes[2..].try_into().map_err(|_| ChatError::Identity)?,
    )
    .map_err(|_| ChatError::Identity)?;
    Ok(bytes[2..].to_vec())
}

fn matches(credential: &Credential, key: &[u8], expected: &str) -> bool {
    credential.credential_type() == CredentialType::Basic
        && credential.serialized_content() == expected.as_bytes()
        && public_from_did(expected).is_ok_and(|public| public == key)
}

fn join_config() -> MlsGroupJoinConfig {
    MlsGroupJoinConfig::builder()
        .padding_size(256)
        .sender_ratchet_configuration(SenderRatchetConfiguration::new(10, 100))
        .build()
}

struct Engine {
    provider: OpenMlsRustCrypto,
    signer: SignatureKeyPair,
    credential: CredentialWithKey,
    own: String,
    peer: String,
    issued_package: bool,
    peer_package: Option<String>,
    group: Option<MlsGroup>,
    store: Option<StateStore>,
    pending: Vec<PendingMessage>,
    received: Vec<ReceivedMessage>,
    delivery: delivery::DeliveryState,
}

impl Engine {
    fn snapshot(&self) -> Result<Snapshot, ChatError> {
        let values = self
            .provider
            .storage()
            .values
            .read()
            .map_err(|_| ChatError::Storage)?;
        Ok(Snapshot {
            version: 2,
            engine_version: STATE_ENGINE_VERSION.into(),
            values: values
                .iter()
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect(),
            group: self
                .group
                .as_ref()
                .map(|group| group.group_id().as_slice().to_vec()),
            issued_package: self.issued_package,
            peer_package: self.peer_package.clone(),
            pending: self.pending.clone(),
            received: self.received.clone(),
            delivery: self.delivery.clone(),
        })
    }
    fn queue(&mut self, kind: PendingKind, wire: &[u8]) -> Result<(), ChatError> {
        if self.store.is_some() {
            if self.pending.len() >= 32 {
                return Err(ChatError::Limit);
            }
            self.pending.push(PendingMessage {
                id: wire_id(wire),
                kind,
                wire: wire.to_vec(),
            });
        }
        Ok(())
    }
}

/// An opaque, explicitly closeable native conversation. No key export API.
#[derive(uniffi::Object)]
pub struct PrivateChat {
    engine: Mutex<Option<Engine>>,
}

impl PrivateChat {
    fn mutate<T>(
        &self,
        operation: impl FnOnce(&mut Engine) -> Result<T, ChatError>,
    ) -> Result<T, ChatError> {
        let mut guard = self.engine.lock().map_err(|_| ChatError::Closed)?;
        let result = (|| {
            let engine = guard.as_mut().ok_or(ChatError::Closed)?;
            let output = operation(engine)?;
            if engine.store.is_some() {
                let snapshot = engine.snapshot()?;
                engine
                    .store
                    .as_mut()
                    .ok_or(ChatError::Storage)?
                    .save(&snapshot)?;
            }
            Ok(output)
        })();
        // No advanced state may be reused after an unsuccessful persistent operation.
        if result.is_err() && guard.as_ref().is_some_and(|engine| engine.store.is_some()) {
            guard.take();
        }
        result
    }
    fn with_engine<T>(
        &self,
        operation: impl FnOnce(&mut Engine) -> Result<T, ChatError>,
    ) -> Result<T, ChatError> {
        let mut guard = self.engine.lock().map_err(|_| ChatError::Closed)?;
        operation(guard.as_mut().ok_or(ChatError::Closed)?)
    }
}

#[uniffi::export]
impl PrivateChat {
    /// `secret` is the existing account Ed25519 seed, never the recovery phrase.
    #[uniffi::constructor]
    pub fn new(secret: Vec<u8>, expected_peer: String) -> Result<Arc<Self>, ChatError> {
        let secret = Zeroizing::new(secret);
        let bytes: &[u8; 32] = secret
            .as_slice()
            .try_into()
            .map_err(|_| ChatError::Identity)?;
        let signing = SigningKey::from_bytes(bytes);
        let public = signing.verifying_key().to_bytes();
        let own = did(&public);
        public_from_did(&expected_peer)?;
        if expected_peer == own {
            return Err(ChatError::Peer);
        }
        let provider = OpenMlsRustCrypto::default();
        let signer = SignatureKeyPair::from_raw(
            SUITE.signature_algorithm(),
            secret.to_vec(),
            public.to_vec(),
        );
        signer
            .store(provider.storage())
            .map_err(|_| ChatError::State)?;
        let credential = CredentialWithKey {
            credential: BasicCredential::new(own.as_bytes().to_vec()).into(),
            signature_key: public.to_vec().into(),
        };
        Ok(Arc::new(Self {
            engine: Mutex::new(Some(Engine {
                provider,
                signer,
                credential,
                own,
                peer: expected_peer,
                issued_package: false,
                peer_package: None,
                group: None,
                store: None,
                pending: Vec::new(),
                received: Vec::new(),
                delivery: delivery::DeliveryState::default(),
            })),
        }))
    }

    /// Native callers choose a private no-backup path; keys never leave this object.
    #[uniffi::constructor]
    pub fn open(
        secret: Vec<u8>,
        expected_peer: String,
        storage_key: Vec<u8>,
        path: String,
    ) -> Result<Arc<Self>, ChatError> {
        let storage_key = Zeroizing::new(storage_key);
        let chat = Self::new(secret, expected_peer)?;
        chat.with_engine(|engine| {
            let (mut store, snapshot) =
                StateStore::open(&path, storage_key.to_vec(), &engine.own, &engine.peer)?;
            if let Some(snapshot) = snapshot {
                if ![1, 2].contains(&snapshot.version)
                    || !snapshot.delivery.valid()
                    || snapshot.engine_version != STATE_ENGINE_VERSION
                    || snapshot.pending.len() > 32
                    || snapshot.received.len() > 32
                    || snapshot
                        .group
                        .as_ref()
                        .is_some_and(|id| id.is_empty() || id.len() > 1024)
                    || snapshot
                        .pending
                        .iter()
                        .any(|item| bounded(&item.wire).is_err() || item.id != wire_id(&item.wire))
                    || snapshot.received.iter().any(|item| {
                        item.id.len() != 43 || item.text.is_empty() || item.text.len() > MAX_TEXT
                    })
                {
                    return Err(ChatError::Storage);
                }
                let count = snapshot.values.len();
                let values: std::collections::HashMap<_, _> = snapshot.values.into_iter().collect();
                if values.len() != count {
                    return Err(ChatError::Storage);
                }
                *engine
                    .provider
                    .storage()
                    .values
                    .write()
                    .map_err(|_| ChatError::Storage)? = values;
                engine.group = snapshot
                    .group
                    .map(|id| {
                        MlsGroup::load(engine.provider.storage(), &GroupId::from_slice(&id))
                            .map_err(|_| ChatError::Storage)?
                            .ok_or(ChatError::Storage)
                    })
                    .transpose()?;
                if let Some(group) = &engine.group {
                    let members: Vec<_> = group.members().collect();
                    if members.len() != 2
                        || members
                            .iter()
                            .filter(|m| matches(&m.credential, &m.signature_key, &engine.own))
                            .count()
                            != 1
                        || members
                            .iter()
                            .filter(|m| matches(&m.credential, &m.signature_key, &engine.peer))
                            .count()
                            != 1
                    {
                        return Err(ChatError::Storage);
                    }
                }
                engine.issued_package = snapshot.issued_package;
                engine.peer_package = snapshot.peer_package;
                engine.pending = snapshot.pending;
                engine.received = snapshot.received;
                engine.delivery = snapshot.delivery;
            } else {
                store.save(&engine.snapshot()?)?;
            }
            engine.store = Some(store);
            Ok(())
        })?;
        Ok(chat)
    }

    pub fn pending(&self) -> Result<Vec<PendingMessage>, ChatError> {
        self.with_engine(|engine| Ok(engine.pending.clone()))
    }
    pub fn received(&self) -> Result<Vec<ReceivedMessage>, ChatError> {
        self.with_engine(|engine| Ok(engine.received.clone()))
    }

    /// Derived from committed state; no group identifiers or private keys leave Rust.
    pub fn handshake_state(&self) -> Result<HandshakeState, ChatError> {
        self.with_engine(|engine| {
            Ok(if engine.group.is_some() {
                HandshakeState::Established
            } else if engine.issued_package {
                HandshakeState::Offered
            } else {
                HandshakeState::Fresh
            })
        })
    }

    /// Consume exact queued bytes after the caller verifies its transport/peer acknowledgement.
    /// This is not a delivery or read receipt, and does not remove conversation history.
    pub fn acknowledge_pending(&self, id: String) -> Result<bool, ChatError> {
        if !URL_SAFE_NO_PAD
            .decode(&id)
            .is_ok_and(|bytes| bytes.len() == 32 && URL_SAFE_NO_PAD.encode(bytes) == id)
        {
            return Err(ChatError::Message);
        }
        self.mutate(|engine| {
            let Some(index) = engine.pending.iter().position(|item| item.id == id) else {
                return Ok(false);
            };
            // Before join, these are the only saved public bytes we can republish.
            if engine.pending[index].kind == PendingKind::KeyPackage && engine.group.is_none() {
                return Err(ChatError::State);
            }
            engine.pending.remove(index);
            Ok(true)
        })
    }

    /// Public handshake bytes; private init keys remain in the provider.
    pub fn key_package(&self) -> Result<Vec<u8>, ChatError> {
        self.mutate(|engine| {
            if engine.issued_package || engine.group.is_some() {
                return Err(ChatError::State);
            }
            let bundle = KeyPackage::builder()
                .build(
                    SUITE,
                    &engine.provider,
                    &engine.signer,
                    engine.credential.clone(),
                )
                .map_err(|_| ChatError::Message)?;
            let wire = bundle
                .key_package()
                .tls_serialize_detached()
                .map_err(|_| ChatError::Message)?;
            engine.issued_package = true;
            engine.queue(PendingKind::KeyPackage, &wire)?;
            Ok(wire)
        })
    }

    /// Create a two-member group and return its Welcome, for the expected peer only.
    pub fn initiate(&self, package: Vec<u8>) -> Result<Vec<u8>, ChatError> {
        bounded(&package)?;
        self.mutate(|engine| initiate_engine(engine, package))
    }

    pub fn join(&self, welcome: Vec<u8>) -> Result<(), ChatError> {
        bounded(&welcome)?;
        self.mutate(|engine| join_engine(engine, welcome))
    }

    pub fn encrypt(&self, text: String) -> Result<Vec<u8>, ChatError> {
        if text.is_empty() || text.len() > MAX_TEXT {
            return Err(ChatError::Limit);
        }
        self.mutate(|engine| {
            let wire = engine
                .group
                .as_mut()
                .ok_or(ChatError::State)?
                .create_message(&engine.provider, &engine.signer, text.as_bytes())
                .map_err(|_| ChatError::Message)?
                .tls_serialize_detached()
                .map_err(|_| ChatError::Message)?;
            engine.queue(PendingKind::Application, &wire)?;
            Ok(wire)
        })
    }

    pub fn decrypt(&self, wire: Vec<u8>) -> Result<String, ChatError> {
        bounded(&wire)?;
        self.mutate(|engine| {
            let id = wire_id(&wire);
            let message =
                MlsMessageIn::tls_deserialize_exact(wire).map_err(|_| ChatError::Message)?;
            // Reject public handshake traffic: this slice only accepts private text.
            let MlsMessageBodyIn::PrivateMessage(message) = message.extract() else {
                return Err(ChatError::Message);
            };
            let processed = engine
                .group
                .as_mut()
                .ok_or(ChatError::State)?
                .process_message(&engine.provider, message)
                .map_err(|_| ChatError::Message)?;
            if processed.credential().serialized_content() != engine.peer.as_bytes() {
                return Err(ChatError::Peer);
            }
            let ProcessedMessageContent::ApplicationMessage(message) = processed.into_content()
            else {
                return Err(ChatError::Message);
            };
            let bytes = message.into_bytes();
            if bytes.is_empty() || bytes.len() > MAX_TEXT {
                return Err(ChatError::Limit);
            }
            let text = String::from_utf8(bytes).map_err(|_| ChatError::Message)?;
            if engine.store.is_some() {
                if engine.received.len() >= 32 {
                    return Err(ChatError::Limit);
                }
                engine.received.push(ReceivedMessage {
                    id,
                    text: text.clone(),
                });
            }
            Ok(text)
        })
    }

    pub fn shutdown(&self) -> Result<(), ChatError> {
        self.engine.lock().map_err(|_| ChatError::Closed)?.take();
        Ok(())
    }
}

fn initiate_engine(engine: &mut Engine, package: Vec<u8>) -> Result<Vec<u8>, ChatError> {
    if engine.group.is_some() || engine.issued_package {
        return Err(ChatError::State);
    }
    let package_id = wire_id(&package);
    let package = KeyPackageIn::tls_deserialize_exact(package)
        .map_err(|_| ChatError::Message)?
        .validate(engine.provider.crypto(), ProtocolVersion::Mls10)
        .map_err(|_| ChatError::Message)?;
    if package.ciphersuite() != SUITE
        || !matches(
            package.leaf_node().credential(),
            package.leaf_node().signature_key().as_slice(),
            &engine.peer,
        )
    {
        return Err(ChatError::Peer);
    }
    // A rejected handshake must not leave arbitrary groups in storage.
    // Only install this provider once the complete handshake succeeds.
    let provider = OpenMlsRustCrypto::default();
    engine
        .signer
        .store(provider.storage())
        .map_err(|_| ChatError::State)?;
    let mut group = MlsGroup::builder()
        .ciphersuite(SUITE)
        .padding_size(256)
        .sender_ratchet_configuration(SenderRatchetConfiguration::new(10, 100))
        .use_ratchet_tree_extension(true)
        .build(&provider, &engine.signer, engine.credential.clone())
        .map_err(|_| ChatError::Message)?;
    let (_, welcome, _) = group
        .add_members(&provider, &engine.signer, &[package])
        .map_err(|_| ChatError::Message)?;
    let wire = welcome
        .tls_serialize_detached()
        .map_err(|_| ChatError::Message)?;
    bounded(&wire)?;
    group
        .merge_pending_commit(&provider)
        .map_err(|_| ChatError::Message)?;
    engine.provider = provider;
    engine.group = Some(group);
    engine.peer_package = Some(package_id);
    engine.queue(PendingKind::Welcome, &wire)?;
    Ok(wire)
}

fn join_engine(engine: &mut Engine, welcome: Vec<u8>) -> Result<(), ChatError> {
    if engine.group.is_some() || !engine.issued_package {
        return Err(ChatError::State);
    }
    let message = MlsMessageIn::tls_deserialize_exact(welcome).map_err(|_| ChatError::Message)?;
    let MlsMessageBodyIn::Welcome(welcome) = message.extract() else {
        return Err(ChatError::Message);
    };
    let staged = StagedWelcome::new_from_welcome(&engine.provider, &join_config(), welcome, None)
        .map_err(|_| ChatError::Message)?;
    let members: Vec<_> = staged.members().collect();
    if members.len() != 2
        || members
            .iter()
            .filter(|member| matches(&member.credential, &member.signature_key, &engine.own))
            .count()
            != 1
        || members
            .iter()
            .filter(|member| matches(&member.credential, &member.signature_key, &engine.peer))
            .count()
            != 1
    {
        return Err(ChatError::Peer);
    }
    if staged.group_context().ciphersuite() != SUITE {
        return Err(ChatError::Message);
    }
    engine.group = Some(
        staged
            .into_group(&engine.provider)
            .map_err(|_| ChatError::Message)?,
    );
    Ok(())
}

fn bounded(bytes: &[u8]) -> Result<(), ChatError> {
    if bytes.is_empty() || bytes.len() > MAX_WIRE {
        Err(ChatError::Limit)
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod persistence_tests;
#[cfg(test)]
mod tests;
