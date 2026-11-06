use super::*;

#[test]
fn unknown_sessions_fail_closed() {
    let registry = ChatSessions::default();
    assert!(registry.get("unknown").is_err());
    assert!(registry.remove("unknown").is_err());
}
