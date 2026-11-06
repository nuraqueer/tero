use super::*;

#[test]
fn native_commands_reject_unbounded_or_empty_wire() {
    assert!(valid_wire(&[]).is_err());
    assert!(valid_wire(&[0; MAX_CHAT_WIRE_BYTES + 1]).is_err());
    assert!(valid_wire(&[0; MAX_CHAT_WIRE_BYTES]).is_ok());
}

#[test]
fn native_commands_reject_empty_or_oversized_text() {
    assert!(valid_text("").is_err());
    assert!(valid_text(&"a".repeat(MAX_CHAT_TEXT_BYTES + 1)).is_err());
    assert!(valid_text(&"a".repeat(MAX_CHAT_TEXT_BYTES)).is_ok());
    assert!(valid_text(&"界".repeat(1366)).is_err());
}

#[test]
fn unknown_sessions_fail_closed() {
    let registry = ChatSessions::default();
    assert!(registry.get("unknown").is_err());
    assert!(registry.remove("unknown").is_err());
}
