use chacha20poly1305::{
    XChaCha20Poly1305, XNonce,
    aead::{Aead, KeyInit, OsRng, Payload, rand_core::RngCore},
};
use rusqlite::{Connection, OptionalExtension, TransactionBehavior, params};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::{ChatError, PendingMessage, ReceivedMessage};

const LIMIT: usize = 4 * 1024 * 1024;

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Snapshot {
    pub version: u8,
    pub engine_version: String,
    pub values: Vec<(Vec<u8>, Vec<u8>)>,
    pub group: Option<Vec<u8>>,
    pub issued_package: bool,
    #[serde(default)]
    pub peer_package: Option<String>,
    pub pending: Vec<PendingMessage>,
    pub received: Vec<ReceivedMessage>,
    #[serde(default)]
    pub delivery: crate::delivery::DeliveryState,
}

pub(crate) struct StateStore {
    connection: Connection,
    key: Zeroizing<Vec<u8>>,
    revision: i64,
    context: Vec<u8>,
}

impl StateStore {
    pub fn open(
        path: &str,
        key: Vec<u8>,
        own: &str,
        peer: &str,
    ) -> Result<(Self, Option<Snapshot>), ChatError> {
        let key = Zeroizing::new(key);
        if key.len() != 32 {
            return Err(ChatError::Storage);
        }
        let connection = Connection::open(path).map_err(|_| ChatError::Storage)?;
        connection
            .execute_batch(
                "PRAGMA journal_mode=DELETE;
                 PRAGMA synchronous=FULL;
                 PRAGMA secure_delete=ON;
                 CREATE TABLE IF NOT EXISTS message_state (
                   singleton INTEGER PRIMARY KEY CHECK(singleton=1),
                   revision INTEGER NOT NULL CHECK(revision>0),
                   box BLOB NOT NULL
                 );",
            )
            .map_err(|_| ChatError::Storage)?;
        let meta: Option<(i64, i64)> = connection
            .query_row(
                "SELECT revision,length(box) FROM message_state WHERE singleton=1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|_| ChatError::Storage)?;
        let context = serde_json::to_vec(&("sefirah-message-state/v1", own, peer))
            .map_err(|_| ChatError::Storage)?;
        let store = Self {
            connection,
            key,
            revision: meta.map_or(0, |meta| meta.0),
            context,
        };
        let Some((revision, length)) = meta else {
            return Ok((store, None));
        };
        if revision <= 0 || !(40..=(LIMIT + 40) as i64).contains(&length) {
            return Err(ChatError::Storage);
        }
        let wire: Vec<u8> = store
            .connection
            .query_row(
                "SELECT box FROM message_state WHERE singleton=1",
                [],
                |row| row.get(0),
            )
            .map_err(|_| ChatError::Storage)?;
        let cipher =
            XChaCha20Poly1305::new_from_slice(&store.key).map_err(|_| ChatError::Storage)?;
        let plain = Zeroizing::new(
            cipher
                .decrypt(
                    XNonce::from_slice(&wire[..24]),
                    Payload {
                        msg: &wire[24..],
                        aad: &store.aad(revision),
                    },
                )
                .map_err(|_| ChatError::Storage)?,
        );
        let snapshot = serde_json::from_slice(&plain).map_err(|_| ChatError::Storage)?;
        Ok((store, Some(snapshot)))
    }

    fn aad(&self, revision: i64) -> Vec<u8> {
        let mut context = self.context.clone();
        context.extend_from_slice(&revision.to_be_bytes());
        context
    }

    pub fn save(&mut self, snapshot: &Snapshot) -> Result<(), ChatError> {
        let plain = Zeroizing::new(serde_json::to_vec(snapshot).map_err(|_| ChatError::Storage)?);
        if plain.len() > LIMIT {
            return Err(ChatError::Limit);
        }
        let revision = self.revision.checked_add(1).ok_or(ChatError::Storage)?;
        let cipher =
            XChaCha20Poly1305::new_from_slice(&self.key).map_err(|_| ChatError::Storage)?;
        let mut nonce = [0u8; 24];
        OsRng.fill_bytes(&mut nonce);
        let mut wire = nonce.to_vec();
        wire.extend(
            cipher
                .encrypt(
                    XNonce::from_slice(&nonce),
                    Payload {
                        msg: &plain,
                        aad: &self.aad(revision),
                    },
                )
                .map_err(|_| ChatError::Storage)?,
        );
        let transaction = self
            .connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(|_| ChatError::Storage)?;
        let stored: i64 = transaction
            .query_row(
                "SELECT COALESCE((SELECT revision FROM message_state WHERE singleton=1),0)",
                [],
                |row| row.get(0),
            )
            .map_err(|_| ChatError::Storage)?;
        if stored != self.revision {
            return Err(ChatError::Storage);
        }
        transaction
            .execute(
                "INSERT INTO message_state(singleton,revision,box) VALUES(1,?1,?2)
             ON CONFLICT(singleton) DO UPDATE SET revision=excluded.revision,box=excluded.box",
                params![revision, wire],
            )
            .map_err(|_| ChatError::Storage)?;
        transaction.commit().map_err(|_| ChatError::Storage)?;
        self.revision = revision;
        Ok(())
    }
}
