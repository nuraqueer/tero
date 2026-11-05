//! Read-only compatibility inspection for the existing two-slot Tero vault.
//!
//! The legacy device-bound vault is not decrypted or migrated here. Never
//! replace its ciphertext until a separate, tested recovery path exists.

use base64::{Engine as _, engine::general_purpose::STANDARD};
use chacha20poly1305::{XChaCha20Poly1305, XNonce, aead::{Aead, KeyInit, Payload}};
use hkdf::Hkdf;
use scrypt::{Params, scrypt};
use sha2::Sha256;
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
            let payload = String::from_utf8(plaintext[2..2 + length].to_vec())
                .map_err(|_| VaultFormatError::InvalidPayload)?;
            if opened.is_none() {
                opened = Some(OpenedLegacySlot { slot: slot as u8, payload: Zeroizing::new(payload) });
            }
        }
    }
    Ok(opened)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_vault() -> String {
        let mut bytes = vec![0_u8; VAULT_LENGTH];
        bytes[..4].copy_from_slice(&[VERSION, 12, 8, 1]);
        bytes[4..HEADER_LENGTH].copy_from_slice(&[42; SALT_LENGTH]);
        STANDARD.encode(bytes)
    }

    fn encrypted_vault() -> String {
        let mut bytes = STANDARD.decode(sample_vault()).unwrap();
        let params = Params::new(12, 8, 1).unwrap();
        let mut stretched = [0_u8; 32];
        scrypt(b"123456", &[42; SALT_LENGTH], &params, &mut stretched).unwrap();
        let mut ikm = [0_u8; 64];
        ikm[..32].copy_from_slice(&stretched);
        ikm[32..].copy_from_slice(&[7; 32]);
        let hkdf = Hkdf::<Sha256>::new(None, &ikm);
        let mut key = [0_u8; 32];
        hkdf.expand(SLOT_INFO, &mut key).unwrap();
        let cipher = XChaCha20Poly1305::new_from_slice(&key).unwrap();
        let mut plaintext = [0_u8; PLAINTEXT_LENGTH];
        plaintext[1] = 5;
        plaintext[2..7].copy_from_slice(b"hello");
        let nonce = [9_u8; NONCE_LENGTH];
        let encrypted = cipher.encrypt(XNonce::from_slice(&nonce), Payload {
            msg: &plaintext,
            aad: &bytes[..HEADER_LENGTH],
        }).unwrap();
        let start = HEADER_LENGTH + SLOT_LENGTH;
        bytes[start..start + NONCE_LENGTH].copy_from_slice(&nonce);
        bytes[start + NONCE_LENGTH..].copy_from_slice(&encrypted);
        STANDARD.encode(bytes)
    }

    #[test]
    fn reads_legacy_header_without_accessing_ciphertext() {
        let header = inspect_legacy_vault(&sample_vault()).unwrap();
        assert_eq!((header.log2_n, header.r, header.p), (12, 8, 1));
        assert_eq!(header.salt, [42; SALT_LENGTH]);
    }

    #[test]
    fn refuses_truncated_and_oversized_vaults() {
        let vault = sample_vault();
        assert_eq!(inspect_legacy_vault(&vault[..vault.len() - 4]), Err(VaultFormatError::InvalidLength));
        assert_eq!(inspect_legacy_vault(&(vault + "AAAA")), Err(VaultFormatError::InvalidLength));
    }

    #[test]
    fn rejects_invalid_encoding_version_and_parameters() {
        let mut bytes = STANDARD.decode(sample_vault()).unwrap();
        bytes[0] = 2;
        assert_eq!(inspect_legacy_vault(&STANDARD.encode(&bytes)), Err(VaultFormatError::UnsupportedVersion));
        bytes[0] = VERSION;
        bytes[2] = 0;
        assert_eq!(inspect_legacy_vault(&STANDARD.encode(&bytes)), Err(VaultFormatError::InvalidScryptParameters));
        assert_eq!(inspect_legacy_vault(&"!".repeat(sample_vault().len())), Err(VaultFormatError::InvalidEncoding));
    }

    #[test]
    fn unlocks_only_the_matching_slot_and_device_secret() {
        let encoded = encrypted_vault();
        let opened = open_legacy_vault(&encoded, "123456", &[7; 32]).unwrap().unwrap();
        assert_eq!(opened.slot, 1);
        assert_eq!(opened.payload.as_str(), "hello");
        assert!(open_legacy_vault(&encoded, "654321", &[7; 32]).unwrap().is_none());
        assert!(open_legacy_vault(&encoded, "123456", &[8; 32]).unwrap().is_none());
    }

    #[test]
    fn refuses_expensive_parameters_before_running_scrypt() {
        let mut bytes = STANDARD.decode(sample_vault()).unwrap();
        bytes[1] = 25;
        assert!(matches!(
            open_legacy_vault(&STANDARD.encode(bytes), "passcode", &[7; 32]),
            Err(VaultFormatError::UnsupportedScryptCost)
        ));
    }
}
