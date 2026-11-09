use super::*;

#[test]
fn identity_starts_locked_and_relock_is_idempotent() {
    let identity = NativeIdentity::default();
    let chats = ChatSessions::default();
    assert!(!identity.is_unlocked().unwrap());
    identity.lock(&chats).unwrap();
    identity.lock(&chats).unwrap();
    assert!(!identity.is_unlocked().unwrap());
}

#[test]
fn native_chat_cannot_open_before_verified_recovery() {
    let identity = NativeIdentity::default();
    let chats = ChatSessions::default();
    assert!(identity.open_chat(
        &chats,
        "a".repeat(43),
        "untrusted-peer".to_string(),
        "ignored-path".to_string(),
    ).is_err());
}

#[test]
fn invalid_device_bound_vault_never_unlocks() {
    let identity = NativeIdentity::default();
    assert!(identity.restore_legacy("invalid", &[0_u8; 32], "123456").is_err());
    assert!(!identity.is_unlocked().unwrap());
}
