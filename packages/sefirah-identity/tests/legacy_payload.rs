use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use sefirah_identity::{LegacyAccountPayload, VaultFormatError, parse_legacy_slot};

#[test]
fn recognises_basic_decoy_without_identity() {
    assert!(matches!(
        parse_legacy_slot(r#"{"v":1,"mode":"basic"}"#),
        Ok(LegacyAccountPayload::Basic)
    ));
}

#[test]
fn recognises_full_legacy_records_with_and_without_cached_seed() {
    let old = r#"{"v":1,"mode":"full","phrase":"valid recovery words"}"#;
    match parse_legacy_slot(old).unwrap() {
        LegacyAccountPayload::Full { phrase, seed } => {
            assert_eq!(phrase.as_str(), "valid recovery words");
            assert!(seed.is_none());
        }
        LegacyAccountPayload::Basic => panic!("full vault became decoy"),
    }

    let encoded = URL_SAFE_NO_PAD.encode([23_u8; 64]);
    let record = format!(r#"{{"v":1,"mode":"full","phrase":"valid recovery words","seed":"{encoded}"}}"#);
    match parse_legacy_slot(&record).unwrap() {
        LegacyAccountPayload::Full { seed: Some(seed), .. } => assert_eq!(&seed[..], &[23; 64]),
        _ => panic!("cached seed not restored"),
    }
}

#[test]
fn refuses_invalid_or_ambiguous_identity_records() {
    for text in [
        r#"{"v":2,"mode":"basic"}"#,
        r#"{"v":1,"mode":"basic","phrase":"secret"}"#,
        r#"{"v":1,"mode":"full","phrase":" "}"#,
        r#"{"v":1,"mode":"full","phrase":"words","seed":"invalid!"}"#,
        r#"{"v":1,"mode":"full","phrase":"words","seed":"AA"}"#,
        r#"{"v":1,"mode":"unknown"}"#,
        "not JSON",
    ] {
        assert!(matches!(parse_legacy_slot(text), Err(VaultFormatError::InvalidPayload)), "{text}");
    }
}
