//! Read-only compatibility inspection for the existing two-slot Tero vault.
//!
//! The legacy device-bound vault is not decrypted or migrated here. Never
//! replace its ciphertext until a separate, tested recovery path exists.

use base64::{Engine as _, engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD}};
use bip39::{Language, Mnemonic};
use chacha20poly1305::{XChaCha20Poly1305, XNonce, aead::{Aead, KeyInit, Payload}};
use hkdf::Hkdf;
use scrypt::{Params, scrypt};
use sha2::Sha256;
use subtle::ConstantTimeEq;
use zeroize::Zeroizing;

const VERSION: u8 = 1;
const SALT_LENGTH: usize = 16;
const NONCE_LENGTH: usize = 24;
const PLAINTEXT_LENGTH: usize = 512;
const TAG_LENGTH: usize = 16;
const HEADER_LENGTH: usize = 4 + SALT_LENGTH;
const SLOT_LENGTH: usize = NONCE_LENGTH + PLAINTEXT_LENGTH + TAG_LENGTH;
const VAULT_LENGTH: usize = HEADER_LENGTH + 2 * SLOT_LENGTH;
const SLOT_INFO: &[u8] = b"tero/vault-slot/v1";
const DERIVATION_SALT: &[u8] = b"tero/key-derivation/v1";

/// Reproduce the legacy purpose separation while keeping the 64-byte account
/// seed native-side. Callers must not serialize the returned key into JS.
pub fn derive_native_secret(seed: &[u8; 64], purpose: &str, index: u32) -> Result<Zeroizing<[u8; 32]>, VaultFormatError> {
    if !matches!(purpose, "identity" | "messaging" | "cards" | "journeys" | "app") {
        return Err(VaultFormatError::InvalidPayload);
    }
    let hkdf = Hkdf::<Sha256>::new(Some(DERIVATION_SALT), seed);
    let mut key = Zeroizing::new([0_u8; 32]);
    hkdf.expand(format!("{purpose}/{index}").as_bytes(), &mut key[..])
        .map_err(|_| VaultFormatError::InvalidPayload)?;
    Ok(key)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VaultFormatError {
    InvalidEncoding,
    InvalidLength,
    UnsupportedVersion,
    InvalidScryptParameters,
    UnsupportedScryptCost,
    InvalidPayload,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LegacyVaultHeader {
    pub log2_n: u8,
    pub r: u8,
    pub p: u8,
    pub salt: [u8; SALT_LENGTH],
}

pub struct OpenedLegacySlot {
    pub slot: u8,
    /// Caller must keep this native-side and clear it when locking the session.
    pub payload: Zeroizing<String>,
}

/// The legacy decoy slot does not contain account keys. Neither variant is
/// serializable: native callers must never return it through an IPC command.
pub enum LegacyAccountPayload {
    Basic,
    Full {
        phrase: Zeroizing<String>,
        /// Some old installs have only the phrase. Derive the seed natively
        /// after recovery verification, never by sending it to JavaScript.
        seed: Option<Zeroizing<[u8; 64]>>,
    },
}

#[derive(serde::Deserialize)]
#[serde(tag = "mode", deny_unknown_fields)]
enum LegacyPayloadRecord {
    #[serde(rename = "basic")]
    Basic { v: u8 },
    #[serde(rename = "full")]
    Full { v: u8, phrase: String, seed: Option<String> },
}

/// Strictly interpret a decrypted legacy slot. This must be called only in
/// native memory immediately after successful authenticated decryption.
pub fn parse_legacy_slot(payload: &str) -> Result<LegacyAccountPayload, VaultFormatError> {
    let record: LegacyPayloadRecord = serde_json::from_str(payload)
        .map_err(|_| VaultFormatError::InvalidPayload)?;
    match record {
        LegacyPayloadRecord::Basic { v: 1 } => Ok(LegacyAccountPayload::Basic),
        LegacyPayloadRecord::Full { v: 1, phrase, seed } if !phrase.trim().is_empty() => {
            let seed = seed.map(|encoded| {
                let mut decoded = Zeroizing::new(URL_SAFE_NO_PAD.decode(encoded)
                    .map_err(|_| VaultFormatError::InvalidPayload)?);
                if decoded.len() != 64 {
                    return Err(VaultFormatError::InvalidPayload);
                }
                let mut value = Zeroizing::new([0_u8; 64]);
                value.copy_from_slice(&decoded);
                decoded.fill(0);
                Ok(value)
            }).transpose()?;
            Ok(LegacyAccountPayload::Full { phrase: Zeroizing::new(phrase), seed })
        }
        _ => Err(VaultFormatError::InvalidPayload),
    }
}

/// Recover the same 64-byte BIP39 seed as legacy `phraseToSeed`.
/// A basic/decoy slot deliberately yields no identity. Re-deriving also checks
/// cached seeds against the phrase so a mismatched record cannot open a new DID.
/// This is native-only and must never be exposed as a Tauri IPC command.
pub fn recover_legacy_seed(payload: LegacyAccountPayload) -> Result<Option<Zeroizing<[u8; 64]>>, VaultFormatError> {
    match payload {
        LegacyAccountPayload::Basic => Ok(None),
        LegacyAccountPayload::Full { phrase, seed } => {
            // Legacy normalizePhrase: trim, lowercase, collapse whitespace.
            let normalized = Zeroizing::new(phrase.split_whitespace()
                .map(str::to_lowercase)
                .collect::<Vec<_>>()
                .join(" "));
            let mnemonic = Mnemonic::parse_in(Language::English, normalized.as_str())
                .map_err(|_| VaultFormatError::InvalidPayload)?;
            let derived = Zeroizing::new(mnemonic.to_seed(""));
            if let Some(cached) = seed {
                if !bool::from(derived[..].ct_eq(&cached[..])) {
                    return Err(VaultFormatError::InvalidPayload);
                }
            }
            Ok(Some(derived))
        }
    }
}

/// Inspect public vault metadata without deriving keys or exposing either slot.
///
/// The KDF policy is deliberately not enforced here: existing vaults must be
/// recognised before a separate unlock operation decides whether its cost is safe.
pub fn inspect_legacy_vault(encoded: &str) -> Result<LegacyVaultHeader, VaultFormatError> {
    // Reject oversized input before attempting an allocation or decoding.
    if encoded.len() != VAULT_LENGTH.div_ceil(3) * 4 {
        return Err(VaultFormatError::InvalidLength);
    }
    let bytes = STANDARD
        .decode(encoded)
        .map_err(|_| VaultFormatError::InvalidEncoding)?;
    if bytes.len() != VAULT_LENGTH {
        return Err(VaultFormatError::InvalidLength);
    }
    if bytes[0] != VERSION {
        return Err(VaultFormatError::UnsupportedVersion);
    }
    if bytes[1] == 0 || bytes[2] == 0 || bytes[3] == 0 {
        return Err(VaultFormatError::InvalidScryptParameters);
    }

    let mut salt = [0_u8; SALT_LENGTH];
    salt.copy_from_slice(&bytes[4..HEADER_LENGTH]);
    Ok(LegacyVaultHeader {
        log2_n: bytes[1],
        r: bytes[2],
        p: bytes[3],
        salt,
    })
}

/// Unlock the legacy two-slot envelope using a device secret supplied by the
/// native secure-storage layer. This function does not read or write that layer.
/// Never expose the device secret, passcode or decrypted payload to a JS command.
pub fn open_legacy_vault(
    encoded: &str,
    passcode: &str,
    device_secret: &[u8; 32],
) -> Result<Option<OpenedLegacySlot>, VaultFormatError> {
    let header = inspect_legacy_vault(encoded)?;
    // Reject untrusted KDF costs before allocating work memory. Both known
    // production phone costs (12 and 14) are supported; unsupported legacy
    // records remain untouched so recovery can be handled separately.
    if !(10..=15).contains(&header.log2_n) || header.r != 8 || header.p != 1 {
        return Err(VaultFormatError::UnsupportedScryptCost);
    }
    let params = Params::new(header.log2_n, header.r.into(), header.p.into())
        .map_err(|_| VaultFormatError::InvalidScryptParameters)?;

    let mut stretched = Zeroizing::new([0_u8; 32]);
    scrypt(passcode.as_bytes(), &header.salt, &params, &mut stretched[..])
        .map_err(|_| VaultFormatError::InvalidScryptParameters)?;
    let mut ikm = Zeroizing::new([0_u8; 64]);
    ikm[..32].copy_from_slice(&stretched[..]);
    ikm[32..].copy_from_slice(device_secret);

    let hkdf = Hkdf::<Sha256>::new(None, &ikm[..]);
    let mut key = Zeroizing::new([0_u8; 32]);
    hkdf.expand(SLOT_INFO, &mut key[..])
        .map_err(|_| VaultFormatError::InvalidPayload)?;
    let cipher = XChaCha20Poly1305::new_from_slice(&key[..])
        .map_err(|_| VaultFormatError::InvalidPayload)?;

    let bytes = STANDARD.decode(encoded).map_err(|_| VaultFormatError::InvalidEncoding)?;
    let aad = &bytes[..HEADER_LENGTH];
    let mut opened = None;
    for slot in 0..2 {
        let offset = HEADER_LENGTH + slot * SLOT_LENGTH;
        let block = &bytes[offset..offset + SLOT_LENGTH];
        let result = cipher.decrypt(
            XNonce::from_slice(&block[..NONCE_LENGTH]),
            Payload { msg: &block[NONCE_LENGTH..], aad },
        );
        if let Ok(plaintext) = result {
            let plaintext = Zeroizing::new(plaintext);
            let length = usize::from(plaintext[0]) * 256 + usize::from(plaintext[1]);
            if length > PLAINTEXT_LENGTH - 2 {
                return Err(VaultFormatError::InvalidPayload);
            }
            // Validate inside the zeroizing buffer. String::from_utf8 on a
            // temporary Vec would drop malformed plaintext without wiping it.
            let payload = std::str::from_utf8(&plaintext[2..2 + length])
                .map_err(|_| VaultFormatError::InvalidPayload)?
                .to_owned();
            if opened.is_none() {
                opened = Some(OpenedLegacySlot { slot: slot as u8, payload: Zeroizing::new(payload) });
            }
        }
    }
    Ok(opened)
}

#[cfg(test)]
#[path = "../tests/legacy_vault.rs"]
mod tests;
