//! Read-only compatibility inspection for the existing two-slot Tero vault.
//!
//! The legacy device-bound vault is not decrypted or migrated here. Never
//! replace its ciphertext until a separate, tested recovery path exists.

use base64::{Engine as _, engine::general_purpose::STANDARD};

const VERSION: u8 = 1;
const SALT_LENGTH: usize = 16;
const NONCE_LENGTH: usize = 24;
const PLAINTEXT_LENGTH: usize = 512;
const TAG_LENGTH: usize = 16;
const HEADER_LENGTH: usize = 4 + SALT_LENGTH;
const SLOT_LENGTH: usize = NONCE_LENGTH + PLAINTEXT_LENGTH + TAG_LENGTH;
const VAULT_LENGTH: usize = HEADER_LENGTH + 2 * SLOT_LENGTH;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VaultFormatError {
    InvalidEncoding,
    InvalidLength,
    UnsupportedVersion,
    InvalidScryptParameters,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LegacyVaultHeader {
    pub log2_n: u8,
    pub r: u8,
    pub p: u8,
    pub salt: [u8; SALT_LENGTH],
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

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_vault() -> String {
        let mut bytes = vec![0_u8; VAULT_LENGTH];
        bytes[..4].copy_from_slice(&[VERSION, 12, 8, 1]);
        bytes[4..HEADER_LENGTH].copy_from_slice(&[42; SALT_LENGTH]);
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
}
