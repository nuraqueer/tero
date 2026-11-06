    use super::*;

    fn sample_vault() -> String {
        let mut bytes = vec![0_u8; VAULT_LENGTH];
        bytes[..4].copy_from_slice(&[VERSION, 12, 8, 1]);
        bytes[4..HEADER_LENGTH].copy_from_slice(&[42; SALT_LENGTH]);
        STANDARD.encode(bytes)
    }

    fn encrypted_vault_with_payload(payload: &[u8], declared_length: usize) -> String {
        assert!(payload.len() <= PLAINTEXT_LENGTH - 2);
        assert!(declared_length <= u16::MAX as usize);
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
        plaintext[0] = (declared_length >> 8) as u8;
        plaintext[1] = declared_length as u8;
        plaintext[2..2 + payload.len()].copy_from_slice(payload);
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

    fn encrypted_vault() -> String {
        encrypted_vault_with_payload(b"hello", 5)
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

        // The legacy vault randomises slot order. The same protected payload
        // must open in either position without changing the header or key.
        let mut swapped = STANDARD.decode(&encoded).unwrap();
        let (first, second) = swapped[HEADER_LENGTH..].split_at_mut(SLOT_LENGTH);
        first.swap_with_slice(second);
        let opened = open_legacy_vault(&STANDARD.encode(swapped), "123456", &[7; 32])
            .unwrap()
            .unwrap();
        assert_eq!(opened.slot, 0);
        assert_eq!(opened.payload.as_str(), "hello");
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

    #[test]
    fn rejects_authenticated_payloads_with_invalid_text_or_length() {
        assert!(matches!(
            open_legacy_vault(&encrypted_vault_with_payload(&[0xff], 1), "123456", &[7; 32]),
            Err(VaultFormatError::InvalidPayload)
        ));
        assert!(matches!(
            open_legacy_vault(
                &encrypted_vault_with_payload(b"hello", PLAINTEXT_LENGTH - 1),
                "123456",
                &[7; 32]
            ),
            Err(VaultFormatError::InvalidPayload)
        ));
    }

    #[test]
    fn an_authenticated_header_change_never_unlocks_the_slot() {
        let mut bytes = STANDARD.decode(encrypted_vault()).unwrap();
        bytes[4] ^= 1;
        assert!(open_legacy_vault(&STANDARD.encode(bytes), "123456", &[7; 32])
            .unwrap()
            .is_none());
    }
