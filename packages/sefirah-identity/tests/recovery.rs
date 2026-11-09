use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use sefirah_identity::{LegacyAccountPayload, VaultFormatError, parse_legacy_slot, recover_legacy_seed};

const WORDS: &str = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const SEED: &str = "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4";

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect::<String>()
}

#[test]
fn derives_standard_bip39_english_seed_from_old_phrase_only_record() {
    let payload = parse_legacy_slot(&format!(r#"{{"v":1,"mode":"full","phrase":"{WORDS}"}}"#)).unwrap();
    let seed = recover_legacy_seed(payload).unwrap().unwrap();
    assert_eq!(hex(&seed[..]), SEED);
}

#[test]
fn legacy_normalisation_accepts_case_and_extra_spaces() {
    let record = format!(r#"{{"v":1,"mode":"full","phrase":"  {}   "}}"#, WORDS.to_uppercase().replace(' ', "   "));
    let seed = recover_legacy_seed(parse_legacy_slot(&record).unwrap()).unwrap().unwrap();
    assert_eq!(hex(&seed[..]), SEED);
}

#[test]
fn cached_seed_must_match_phrase_and_basic_has_no_seed() {
    let correct = (0..SEED.len()).step_by(2)
        .map(|i| u8::from_str_radix(&SEED[i..i + 2], 16).unwrap())
        .collect::<Vec<_>>();
    let record = format!(r#"{{"v":1,"mode":"full","phrase":"{WORDS}","seed":"{}"}}"#, URL_SAFE_NO_PAD.encode(&correct));
    assert!(recover_legacy_seed(parse_legacy_slot(&record).unwrap()).unwrap().is_some());
    let mismatched = format!(r#"{{"v":1,"mode":"full","phrase":"{WORDS}","seed":"{}"}}"#, URL_SAFE_NO_PAD.encode([1_u8; 64]));
    assert!(matches!(recover_legacy_seed(parse_legacy_slot(&mismatched).unwrap()), Err(VaultFormatError::InvalidPayload)));
    assert!(matches!(recover_legacy_seed(LegacyAccountPayload::Basic), Ok(None)));
}

#[test]
fn invalid_checksum_cannot_restore_identity() {
    let record = format!(r#"{{"v":1,"mode":"full","phrase":"{}"}}"#, WORDS.replace("about", "abandon"));
    assert!(matches!(recover_legacy_seed(parse_legacy_slot(&record).unwrap()), Err(VaultFormatError::InvalidPayload)));
}
