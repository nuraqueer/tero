//! Native-only identity lifecycle. The legacy device secret and passcode must
//! come from a trusted platform storage/unlock flow, never a JavaScript invoke.
//! No code here reads, writes, deletes or replaces the Expo SecureStore keys.

use std::sync::Mutex;
use zeroize::Zeroizing;
use sefirah_identity::{LegacyAccountPayload, open_legacy_vault, parse_legacy_slot, recover_legacy_seed};
use crate::chat_sessions::ChatSessions;

#[derive(Default)]
pub(crate) struct NativeIdentity {
    seed: Mutex<Option<Zeroizing<[u8; 64]>>>,
}

impl NativeIdentity {
    /// An authenticated legacy full slot is required. Basic/decoy opens
    /// intentionally never grant access to native identity keys.
    #[allow(dead_code)]
    pub(crate) fn restore_legacy(
        &self,
        encrypted_vault: &str,
        device_secret: &[u8; 32],
        passcode: &str,
    ) -> Result<bool, &'static str> {
        // Replacing an unlocked identity is forbidden. Call lock first.
        let mut guard = self.seed.lock().map_err(|_| "Native identity unavailable")?;
        if guard.is_some() {
            return Err("Relock before restoring another identity");
        }
        let opened = open_legacy_vault(encrypted_vault, passcode, device_secret)
            .map_err(|_| "Legacy vault is incompatible")?;
        let Some(slot) = opened else { return Ok(false) };
        let record = parse_legacy_slot(&slot.payload)
            .map_err(|_| "Legacy account record is invalid")?;
        match record {
            LegacyAccountPayload::Basic => Ok(false),
            full => {
                let seed = recover_legacy_seed(full)
                    .map_err(|_| "Legacy recovery phrase is invalid")?
                    .ok_or("Legacy identity missing")?;
                *guard = Some(seed);
                Ok(true)
            }
        }
    }

    pub(crate) fn is_unlocked(&self) -> Result<bool, &'static str> {
        Ok(self.seed.lock().map_err(|_| "Native identity unavailable")?.is_some())
    }

    /// Only Rust callers may open MLS chats. The account seed is copied into
    /// a zeroizing temporary and is never returned through an IPC response.
    #[allow(dead_code)]
    pub(crate) fn open_chat(
        &self,
        sessions: &ChatSessions,
        handle: String,
        accepted_peer: String,
        private_database_path: String,
    ) -> Result<(), &'static str> {
        let guard = self.seed.lock().map_err(|_| "Native identity unavailable")?;
        let seed = guard.as_ref().ok_or("Identity is locked")?;
        sessions.open_native_from_seed(handle, **seed, accepted_peer, private_database_path)
    }

    pub(crate) fn lock(&self, sessions: &ChatSessions) -> Result<(), &'static str> {
        // Drop the seed before attempting network and database shutdown.
        // Every chat handle is revoked even if shutdown reports failure.
        let previous = self.seed.lock().map_err(|_| "Native identity unavailable")?.take();
        drop(previous);
        sessions.close_all()
    }
}

#[cfg(test)]
#[path = "../tests/native_identity.rs"]
mod tests;
