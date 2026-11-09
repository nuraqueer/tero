use super::*;
use rusqlite::Connection;
use tempfile::TempDir;

fn identity(seed: u8) -> String {
    did(&SigningKey::from_bytes(&[seed; 32])
        .verifying_key()
        .to_bytes())
}
fn open(directory: &TempDir, own: u8, peer: u8) -> Arc<PrivateChat> {
    PrivateChat::open(
        vec![own; 32],
        identity(peer),
        vec![own + 10; 32],
        directory
            .path()
            .join(format!("{own}.db"))
            .to_str()
            .unwrap()
            .into(),
    )
    .unwrap()
}
fn setup(directory: &TempDir) -> (Arc<PrivateChat>, Arc<PrivateChat>) {
    let alice = open(directory, 1, 2);
    let bob = open(directory, 2, 1);
    let package = bob.key_package().unwrap();
    bob.shutdown().unwrap();
    let bob = open(directory, 2, 1);
    assert_eq!(bob.pending().unwrap()[0].wire, package);
    let welcome = alice.initiate(package).unwrap();
    alice.shutdown().unwrap();
    let alice = open(directory, 1, 2);
    assert_eq!(alice.pending().unwrap()[0].wire, welcome);
    bob.join(welcome).unwrap();
    bob.shutdown().unwrap();
    (alice, open(directory, 2, 1))
}

#[test]
fn handshake_and_two_way_text_survive_restart() {
    let directory = TempDir::new().unwrap();
    let (alice, bob) = setup(&directory);
    let wire = alice.encrypt("Durable private message 🌈".into()).unwrap();
    alice.shutdown().unwrap();
    let alice = open(&directory, 1, 2);
    assert_eq!(alice.pending().unwrap().last().unwrap().wire, wire);
    assert_eq!(
        bob.decrypt(wire.clone()).unwrap(),
        "Durable private message 🌈"
    );
    bob.shutdown().unwrap();
    let bob = open(&directory, 2, 1);
    assert_eq!(
        bob.received().unwrap()[0].text,
        "Durable private message 🌈"
    );
    assert_eq!(
        alice
            .decrypt(bob.encrypt("Reply after restart".into()).unwrap())
            .unwrap(),
        "Reply after restart"
    );
    bob.shutdown().unwrap();
    let bob = open(&directory, 2, 1);
    assert_eq!(bob.decrypt(wire), Err(ChatError::Message));
    assert_eq!(bob.pending(), Err(ChatError::Closed));
}

#[test]
fn wrong_key_peer_and_corruption_fail_closed() {
    let directory = TempDir::new().unwrap();
    let (alice, _) = setup(&directory);
    alice.shutdown().unwrap();
    let path = directory.path().join("1.db").to_str().unwrap().to_owned();
    assert!(matches!(
        PrivateChat::open(vec![1; 32], identity(2), vec![99; 32], path.clone()),
        Err(ChatError::Storage)
    ));
    assert!(matches!(
        PrivateChat::open(vec![1; 32], identity(3), vec![11; 32], path.clone()),
        Err(ChatError::Storage)
    ));
    Connection::open(path)
        .unwrap()
        .execute("UPDATE message_state SET box=zeroblob(length(box))", [])
        .unwrap();
    assert!(matches!(
        PrivateChat::open(
            vec![1; 32],
            identity(2),
            vec![11; 32],
            directory.path().join("1.db").to_str().unwrap().into()
        ),
        Err(ChatError::Storage)
    ));
}

#[test]
fn stale_writer_cannot_release_ciphertext() {
    let directory = TempDir::new().unwrap();
    let (first, _) = setup(&directory);
    let stale = open(&directory, 1, 2);
    let wire = first.encrypt("Only committed sender".into()).unwrap();
    assert_eq!(
        stale.encrypt("Must not escape".into()),
        Err(ChatError::Storage)
    );
    assert_eq!(stale.encrypt("Still closed".into()), Err(ChatError::Closed));
    first.shutdown().unwrap();
    let reopened = open(&directory, 1, 2);
    assert_eq!(reopened.pending().unwrap().last().unwrap().wire, wire);
}

#[test]
fn failed_write_returns_no_text_and_keeps_committed_receive_state() {
    let directory = TempDir::new().unwrap();
    let (alice, bob) = setup(&directory);
    let wire = alice.encrypt("Only after commit".into()).unwrap();
    let connection = Connection::open(directory.path().join("2.db")).unwrap();
    connection.execute_batch("CREATE TRIGGER reject_save BEFORE UPDATE ON message_state BEGIN SELECT RAISE(ABORT,'test'); END;").unwrap();
    assert_eq!(bob.decrypt(wire.clone()), Err(ChatError::Storage));
    assert_eq!(bob.received(), Err(ChatError::Closed));
    connection
        .execute_batch("DROP TRIGGER reject_save;")
        .unwrap();
    let reopened = open(&directory, 2, 1);
    assert!(reopened.received().unwrap().is_empty());
    assert_eq!(reopened.decrypt(wire).unwrap(), "Only after commit");
}

#[test]
fn failed_send_commits_neither_ratchet_nor_queue() {
    let directory = TempDir::new().unwrap();
    let (alice, bob) = setup(&directory);
    let connection = Connection::open(directory.path().join("1.db")).unwrap();
    connection.execute_batch("CREATE TRIGGER reject_save BEFORE UPDATE ON message_state BEGIN SELECT RAISE(ABORT,'test'); END;").unwrap();
    assert_eq!(
        alice.encrypt("Never released".into()),
        Err(ChatError::Storage)
    );
    connection
        .execute_batch("DROP TRIGGER reject_save;")
        .unwrap();
    let reopened = open(&directory, 1, 2);
    assert_eq!(reopened.pending().unwrap().len(), 1);
    assert_eq!(
        bob.decrypt(reopened.encrypt("Saved".into()).unwrap())
            .unwrap(),
        "Saved"
    );
}

#[test]
fn rejects_full_queue_without_eviction_or_ratchet_advance() {
    let directory = TempDir::new().unwrap();
    let (alice, bob) = setup(&directory);
    for _ in 0..31 {
        alice.encrypt("Kept".into()).unwrap();
    }
    let pending = alice.pending().unwrap();
    assert_eq!(pending.len(), 32);
    assert_eq!(alice.encrypt("Overflow".into()), Err(ChatError::Limit));
    let reopened = open(&directory, 1, 2);
    let restored = reopened.pending().unwrap();
    assert_eq!(restored.len(), 32);
    assert_eq!(restored.last().unwrap().wire, pending.last().unwrap().wire);
    assert_eq!(
        bob.decrypt(restored.last().unwrap().wire.clone()).unwrap(),
        "Kept"
    );
}

#[test]
fn database_contains_no_plaintext_identity_or_message() {
    let directory = TempDir::new().unwrap();
    let (alice, bob) = setup(&directory);
    let text = "SYNTHETIC_PRIVATE_INBOX_SENTINEL";
    bob.decrypt(alice.encrypt(text.into()).unwrap()).unwrap();
    alice.shutdown().unwrap();
    bob.shutdown().unwrap();
    for entry in std::fs::read_dir(directory.path()).unwrap() {
        let bytes = std::fs::read(entry.unwrap().path()).unwrap();
        for sensitive in [text, &identity(1), &identity(2)] {
            assert!(
                !bytes
                    .windows(sensitive.len())
                    .any(|window| window == sensitive.as_bytes())
            );
        }
    }
}

#[test]
fn rejects_full_inbox_without_discarding_received_messages() {
    let directory = TempDir::new().unwrap();
    let alice = PrivateChat::new(vec![1; 32], identity(2)).unwrap();
    let bob = open(&directory, 2, 1);
    bob.join(alice.initiate(bob.key_package().unwrap()).unwrap())
        .unwrap();
    for _ in 0..32 {
        bob.decrypt(alice.encrypt("Kept inbox".into()).unwrap())
            .unwrap();
    }
    assert_eq!(
        bob.decrypt(alice.encrypt("Overflow".into()).unwrap()),
        Err(ChatError::Limit)
    );
    let reopened = open(&directory, 2, 1);
    assert_eq!(reopened.received().unwrap().len(), 32);
    assert!(
        reopened
            .received()
            .unwrap()
            .iter()
            .all(|item| item.text == "Kept inbox")
    );
}

#[test]
fn refuses_an_authenticated_snapshot_from_an_unsupported_engine_version() {
    let directory = TempDir::new().unwrap();
    let (alice, _) = setup(&directory);
    alice
        .with_engine(|engine| {
            let mut snapshot = engine.snapshot()?;
            snapshot.engine_version = "unsupported".into();
            engine.store.as_mut().unwrap().save(&snapshot)
        })
        .unwrap();
    alice.shutdown().unwrap();
    assert!(matches!(
        PrivateChat::open(
            vec![1; 32],
            identity(2),
            vec![11; 32],
            directory.path().join("1.db").to_str().unwrap().into()
        ),
        Err(ChatError::Storage)
    ));
}

#[test]
fn handshake_progress_and_package_retry_bytes_survive_restart() {
    let directory = TempDir::new().unwrap();
    let alice = open(&directory, 1, 2);
    let bob = open(&directory, 2, 1);
    assert_eq!(bob.handshake_state().unwrap(), HandshakeState::Fresh);
    let package = bob.key_package().unwrap();
    let id = wire_id(&package);
    assert_eq!(bob.handshake_state().unwrap(), HandshakeState::Offered);
    assert_eq!(bob.acknowledge_pending(id.clone()), Err(ChatError::State));
    let bob = open(&directory, 2, 1);
    assert_eq!(bob.handshake_state().unwrap(), HandshakeState::Offered);
    assert_eq!(bob.pending().unwrap()[0].wire, package);
    bob.join(alice.initiate(package).unwrap()).unwrap();
    assert_eq!(bob.handshake_state().unwrap(), HandshakeState::Established);
    assert!(bob.acknowledge_pending(id.clone()).unwrap());
    assert!(!bob.acknowledge_pending(id).unwrap());
    bob.shutdown().unwrap();
    let bob = open(&directory, 2, 1);
    assert_eq!(bob.handshake_state().unwrap(), HandshakeState::Established);
    assert!(bob.pending().unwrap().is_empty());
    assert_eq!(
        bob.decrypt(alice.encrypt("After join".into()).unwrap())
            .unwrap(),
        "After join"
    );
}

#[test]
fn acknowledgement_is_exact_durable_and_does_not_change_ratchets_or_inbox() {
    let directory = TempDir::new().unwrap();
    let (alice, bob) = setup(&directory);
    let first = alice.encrypt("First".into()).unwrap();
    let second = alice.encrypt("Second".into()).unwrap();
    bob.decrypt(first.clone()).unwrap();
    assert_eq!(
        alice.acknowledge_pending("not-an-id".into()),
        Err(ChatError::Message)
    );
    assert!(!alice.acknowledge_pending(wire_id(b"unknown")).unwrap());
    assert!(alice.acknowledge_pending(wire_id(&first)).unwrap());
    alice.shutdown().unwrap();
    let alice = open(&directory, 1, 2);
    assert_eq!(alice.pending().unwrap().len(), 2); // Welcome and second message.
    assert_eq!(alice.pending().unwrap().last().unwrap().wire, second);
    assert_eq!(bob.received().unwrap()[0].text, "First");
    assert_eq!(bob.decrypt(second).unwrap(), "Second");
    assert_eq!(
        bob.decrypt(alice.encrypt("Third".into()).unwrap()).unwrap(),
        "Third"
    );
}

#[test]
fn failed_acknowledgement_keeps_pending_bytes_and_closes_the_failed_writer() {
    let directory = TempDir::new().unwrap();
    let (alice, _) = setup(&directory);
    let wire = alice
        .encrypt("Retain on failed acknowledgement".into())
        .unwrap();
    let id = wire_id(&wire);
    let connection = Connection::open(directory.path().join("1.db")).unwrap();
    connection.execute_batch("CREATE TRIGGER reject_save BEFORE UPDATE ON message_state BEGIN SELECT RAISE(ABORT,'test'); END;").unwrap();
    assert_eq!(
        alice.acknowledge_pending(id.clone()),
        Err(ChatError::Storage)
    );
    assert_eq!(alice.pending(), Err(ChatError::Closed));
    connection
        .execute_batch("DROP TRIGGER reject_save;")
        .unwrap();
    let reopened = open(&directory, 1, 2);
    assert_eq!(reopened.pending().unwrap().last().unwrap().wire, wire);
    assert!(reopened.acknowledge_pending(id).unwrap());
}

#[test]
fn stale_acknowledgement_cannot_discard_newer_pending_state() {
    let directory = TempDir::new().unwrap();
    let (alice, _) = setup(&directory);
    let wire = alice.encrypt("Queued".into()).unwrap();
    let stale = open(&directory, 1, 2);
    assert!(alice.acknowledge_pending(wire_id(&wire)).unwrap());
    alice.encrypt("Newer queued".into()).unwrap();
    assert_eq!(
        stale.acknowledge_pending(wire_id(&wire)),
        Err(ChatError::Storage)
    );
    assert_eq!(stale.pending(), Err(ChatError::Closed));
    alice.shutdown().unwrap();
    let reopened = open(&directory, 1, 2);
    assert_eq!(reopened.pending().unwrap().len(), 2);
    assert_ne!(reopened.pending().unwrap().last().unwrap().wire, wire);
}

#[test]
fn acknowledged_bytes_release_capacity_without_evicting_other_items() {
    let directory = TempDir::new().unwrap();
    let (alice, bob) = setup(&directory);
    for _ in 0..31 {
        alice.encrypt("Kept".into()).unwrap();
    }
    let pending = alice.pending().unwrap();
    let delivered = pending.last().unwrap();
    bob.decrypt(delivered.wire.clone()).unwrap();
    assert!(alice.acknowledge_pending(delivered.id.clone()).unwrap());
    let wire = alice.encrypt("Capacity reclaimed".into()).unwrap();
    let restored = alice.pending().unwrap();
    assert_eq!(restored.len(), 32);
    assert_eq!(&restored[..31], &pending[..31]);
    assert_eq!(bob.decrypt(wire).unwrap(), "Capacity reclaimed");
}
