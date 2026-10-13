//! Versioned application records carried only inside authenticated MLS messages.
use super::*;
use chacha20poly1305::aead::{OsRng, rand_core::RngCore};
use std::time::{SystemTime, UNIX_EPOCH};

const DAY: u64 = 86_400_000;
const WEEK: u64 = 7 * DAY;
const HISTORY_LIMIT: usize = 256;

#[derive(Clone, Debug, Default, SerdeSerialize, SerdeDeserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct DeliveryState {
    pub history: Vec<ChatItem>,
    pub seen: Vec<String>,
    pub ready_wire: Option<String>,
}

#[derive(Clone, Debug, SerdeSerialize, SerdeDeserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct ChatItem {
    pub id: String,
    pub text: String,
    pub outgoing: bool,
    pub sent_at: u64,
    pub delivered_at: u64,
    pub read_at: u64,
    pub peer_read_at: u64,
    pub expires_at: u64,
    pub wire_id: String,
    #[serde(default)]
    pub receipt_wire: Option<String>,
}

#[derive(SerdeSerialize, SerdeDeserialize)]
#[serde(tag = "type", deny_unknown_fields, rename_all = "camelCase")]
enum Packet {
    Message {
        version: u8,
        id: String,
        text: String,
        at: u64,
    },
    Receipt {
        version: u8,
        id: String,
        read: bool,
        at: u64,
    },
    Ready {
        version: u8,
        welcome: String,
    },
}

#[derive(SerdeDeserialize)]
#[serde(tag = "op", deny_unknown_fields, rename_all = "camelCase")]
enum Action {
    History,
    Initiate { wire: String },
    Send { text: String },
    Receive { wire: String },
    Read { id: String },
    Join { wire: String },
}

fn now() -> Result<u64, ChatError> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()
        .and_then(|v| u64::try_from(v.as_millis()).ok())
        .filter(|v| *v > 0 && *v < u64::MAX - WEEK)
        .ok_or(ChatError::State)
}
fn valid_id(id: &str) -> bool {
    URL_SAFE_NO_PAD
        .decode(id)
        .is_ok_and(|v| v.len() == 32 && URL_SAFE_NO_PAD.encode(v) == id)
}
fn emit(engine: &mut Engine, packet: &Packet, kind: PendingKind) -> Result<String, ChatError> {
    let bytes = serde_json::to_vec(packet).map_err(|_| ChatError::Message)?;
    let wire = engine
        .group
        .as_mut()
        .ok_or(ChatError::State)?
        .create_message(&engine.provider, &engine.signer, &bytes)
        .map_err(|_| ChatError::Message)?
        .tls_serialize_detached()
        .map_err(|_| ChatError::Message)?;
    let id = wire_id(&wire);
    engine.queue(kind, &wire)?;
    Ok(id)
}
fn receipt(engine: &mut Engine, id: String, read: bool, at: u64) -> Result<String, ChatError> {
    emit(
        engine,
        &Packet::Receipt {
            version: 1,
            id,
            read,
            at,
        },
        PendingKind::Control,
    )
}
fn expire(engine: &mut Engine, time: u64) {
    let expired: Vec<_> = engine
        .delivery
        .history
        .iter()
        .filter(|v| v.expires_at <= time)
        .flat_map(|v| std::iter::once(v.wire_id.clone()).chain(v.receipt_wire.clone()))
        .collect();
    engine.delivery.history.retain(|v| v.expires_at > time);
    engine.pending.retain(|v| !expired.contains(&v.id));
}
fn shorten(item: &mut ChatItem) {
    if item.read_at > 0 && item.peer_read_at > 0 {
        item.expires_at = item
            .expires_at
            .min(item.read_at.max(item.peer_read_at).saturating_add(DAY));
    }
}

impl DeliveryState {
    pub(crate) fn valid(&self) -> bool {
        self.history.len() <= HISTORY_LIMIT
            && self.seen.len() <= 512
            && self.seen.iter().all(|id| valid_id(id))
            && self.history.iter().all(|v| {
                valid_id(&v.id)
                    && valid_id(&v.wire_id)
                    && !v.text.is_empty()
                    && v.text.len() <= MAX_TEXT
                    && v.sent_at > 0
                    && v.expires_at > v.sent_at
                    && v.expires_at <= v.sent_at.saturating_add(WEEK)
            })
    }
}

#[uniffi::export]
impl PrivateChat {
    /// This interface never treats carrier storage as a peer acknowledgement.
    pub fn delivery(&self, request: String) -> Result<String, ChatError> {
        if request.len() > 100_000 {
            return Err(ChatError::Limit);
        }
        let action: Action = serde_json::from_str(&request).map_err(|_| ChatError::Message)?;
        let time = now()?;
        if matches!(&action, Action::History) {
            let current = self.with_engine(|engine| {
                if engine.store.is_none() {
                    return Err(ChatError::State);
                }
                if engine.delivery.history.iter().any(|v| v.expires_at <= time) {
                    return Ok(None);
                }
                serde_json::to_string(&engine.delivery.history)
                    .map(Some)
                    .map_err(|_| ChatError::State)
            })?;
            if let Some(current) = current {
                return Ok(current);
            }
        }
        self.mutate(|engine| {
            if engine.store.is_none() {
                return Err(ChatError::State);
            }
            expire(engine, time);
            match action {
                Action::Initiate { wire } => {
                    let wire = URL_SAFE_NO_PAD
                        .decode(wire)
                        .map_err(|_| ChatError::Message)?;
                    bounded(&wire)?;
                    if engine.own >= engine.peer {
                        return Err(ChatError::State);
                    }
                    if engine.group.is_none() {
                        initiate_engine(engine, wire)?;
                    } else if engine.peer_package.as_deref() != Some(wire_id(&wire).as_str()) {
                        return Err(ChatError::State);
                    }
                }
                Action::History => {}
                Action::Send { text } => {
                    if text.is_empty() || text.len() > MAX_TEXT {
                        return Err(ChatError::Limit);
                    }
                    if engine.delivery.history.len() >= HISTORY_LIMIT {
                        return Err(ChatError::Limit);
                    }
                    if engine
                        .pending
                        .iter()
                        .any(|v| v.kind == PendingKind::Welcome)
                    {
                        return Err(ChatError::State);
                    }
                    // Leave half the retry queue for peer receipts so simultaneous
                    // sends cannot prevent either side from acknowledging arrivals.
                    if engine
                        .pending
                        .iter()
                        .filter(|v| v.kind == PendingKind::Application)
                        .count()
                        >= 16
                    {
                        return Err(ChatError::Limit);
                    }
                    let mut random = [0u8; 32];
                    OsRng.fill_bytes(&mut random);
                    let id = URL_SAFE_NO_PAD.encode(random);
                    let wire_id = emit(
                        engine,
                        &Packet::Message {
                            version: 1,
                            id: id.clone(),
                            text: text.clone(),
                            at: time,
                        },
                        PendingKind::Application,
                    )?;
                    engine.delivery.history.push(ChatItem {
                        id,
                        text,
                        outgoing: true,
                        sent_at: time,
                        delivered_at: 0,
                        read_at: time,
                        peer_read_at: 0,
                        expires_at: time + WEEK,
                        wire_id,
                        receipt_wire: None,
                    });
                }
                Action::Join { wire } => {
                    let wire = URL_SAFE_NO_PAD
                        .decode(wire)
                        .map_err(|_| ChatError::Message)?;
                    bounded(&wire)?;
                    let welcome = wire_id(&wire);
                    if engine.own <= engine.peer {
                        return Err(ChatError::State);
                    }
                    if engine.group.is_none() {
                        join_engine(engine, wire)?;
                        engine.pending.retain(|v| v.kind != PendingKind::KeyPackage);
                        engine.delivery.seen.push(welcome.clone());
                    } else if !engine.delivery.seen.contains(&welcome) {
                        return Err(ChatError::State);
                    }
                    if !engine
                        .delivery
                        .ready_wire
                        .as_ref()
                        .is_some_and(|id| engine.pending.iter().any(|v| &v.id == id))
                    {
                        let id = emit(
                            engine,
                            &Packet::Ready {
                                version: 1,
                                welcome,
                            },
                            PendingKind::Control,
                        )?;
                        engine.delivery.ready_wire = Some(id);
                    }
                }
                Action::Read { id } => {
                    if !valid_id(&id) {
                        return Err(ChatError::Message);
                    }
                    let item = engine
                        .delivery
                        .history
                        .iter_mut()
                        .find(|v| v.id == id && !v.outgoing)
                        .ok_or(ChatError::Message)?;
                    if item.read_at == 0 {
                        let read_time = time.max(item.sent_at);
                        item.read_at = read_time;
                        shorten(item);
                        let old_receipt = item.receipt_wire.take();
                        if let Some(old) = old_receipt {
                            engine.pending.retain(|v| v.id != old);
                        }
                        let wire = receipt(engine, id.clone(), true, read_time)?;
                        if let Some(item) = engine.delivery.history.iter_mut().find(|v| v.id == id)
                        {
                            item.receipt_wire = Some(wire);
                        }
                    }
                }
                Action::Receive { wire } => {
                    let wire = URL_SAFE_NO_PAD
                        .decode(wire)
                        .map_err(|_| ChatError::Message)?;
                    bounded(&wire)?;
                    let id = wire_id(&wire);
                    if !engine.delivery.seen.contains(&id)
                        && !engine.delivery.history.iter().any(|v| v.wire_id == id)
                    {
                        let incoming = MlsMessageIn::tls_deserialize_exact(wire)
                            .map_err(|_| ChatError::Message)?;
                        let MlsMessageBodyIn::PrivateMessage(incoming) = incoming.extract() else {
                            return Err(ChatError::Message);
                        };
                        let processed = engine
                            .group
                            .as_mut()
                            .ok_or(ChatError::State)?
                            .process_message(&engine.provider, incoming)
                            .map_err(|_| ChatError::Message)?;
                        if processed.credential().serialized_content() != engine.peer.as_bytes() {
                            return Err(ChatError::Peer);
                        }
                        let ProcessedMessageContent::ApplicationMessage(content) =
                            processed.into_content()
                        else {
                            return Err(ChatError::Message);
                        };
                        let bytes = content.into_bytes();
                        if bytes.len() > 32 * 1024 {
                            return Err(ChatError::Limit);
                        }
                        let packet: Packet =
                            serde_json::from_slice(&bytes).map_err(|_| ChatError::Message)?;
                        match packet {
                            Packet::Message {
                                version,
                                id: message_id,
                                text,
                                at,
                            } => {
                                if version != 1
                                    || !valid_id(&message_id)
                                    || text.is_empty()
                                    || text.len() > MAX_TEXT
                                    || at == 0
                                    || at > time + 300_000
                                {
                                    return Err(ChatError::Message);
                                }
                                if at.saturating_add(WEEK) > time {
                                    if engine.delivery.history.iter().any(|v| v.id == message_id) {
                                        return Err(ChatError::Message);
                                    }
                                    if engine.delivery.history.len() >= HISTORY_LIMIT {
                                        return Err(ChatError::Limit);
                                    }
                                    let receipt_wire =
                                        receipt(engine, message_id.clone(), false, time.max(at))?;
                                    engine.delivery.history.push(ChatItem {
                                        id: message_id.clone(),
                                        text,
                                        outgoing: false,
                                        sent_at: at,
                                        delivered_at: time,
                                        read_at: 0,
                                        peer_read_at: at,
                                        expires_at: at + WEEK,
                                        wire_id: id.clone(),
                                        receipt_wire: Some(receipt_wire),
                                    });
                                }
                            }
                            Packet::Receipt {
                                version,
                                id: message_id,
                                read,
                                at,
                            } => {
                                if version != 1
                                    || !valid_id(&message_id)
                                    || at == 0
                                    || at > time + 300_000
                                {
                                    return Err(ChatError::Message);
                                }
                                if let Some(item) = engine
                                    .delivery
                                    .history
                                    .iter_mut()
                                    .find(|v| v.id == message_id && v.outgoing)
                                {
                                    if at < item.sent_at {
                                        return Err(ChatError::Message);
                                    }
                                    if item.delivered_at == 0 {
                                        item.delivered_at = time;
                                    }
                                    if read && item.peer_read_at == 0 {
                                        item.peer_read_at = at.min(time);
                                    }
                                    shorten(item);
                                    let sent_wire = item.wire_id.clone();
                                    engine.pending.retain(|v| v.id != sent_wire);
                                }
                            }
                            Packet::Ready { version, welcome } => {
                                if version != 1 || !valid_id(&welcome) {
                                    return Err(ChatError::Message);
                                }
                                engine.pending.retain(|v| {
                                    !(v.id == welcome && v.kind == PendingKind::Welcome)
                                });
                            }
                        }
                        engine.delivery.seen.push(id);
                    }
                }
            }
            if engine.delivery.seen.len() > 512 {
                engine
                    .delivery
                    .seen
                    .drain(..engine.delivery.seen.len() - 512);
            }
            expire(engine, time);
            serde_json::to_string(&engine.delivery.history).map_err(|_| ChatError::State)
        })
    }
}
