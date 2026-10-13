use super::*;

fn identity(seed: u8) -> String {
    did(&SigningKey::from_bytes(&[seed; 32])
        .verifying_key()
        .to_bytes())
}

fn chat(seed: u8, peer: u8) -> Arc<PrivateChat> {
    PrivateChat::new(vec![seed; 32], identity(peer)).unwrap()
}

fn pair() -> (Arc<PrivateChat>, Arc<PrivateChat>) {
    let alice = chat(1, 2);
    let bob = chat(2, 1);
    bob.join(alice.initiate(bob.key_package().unwrap()).unwrap())
        .unwrap();
    (alice, bob)
}

#[test]
fn encrypted_exchange_both_directions() {
    let (alice, bob) = pair();
    let text = "Hello, karibu 🌈";
    let encrypted = alice.encrypt(text.into()).unwrap();
    assert!(
        !encrypted
            .windows(text.len())
            .any(|window| window == text.as_bytes())
    );
    assert_eq!(bob.decrypt(encrypted).unwrap(), text);
    assert_eq!(
        alice
            .decrypt(bob.encrypt("Hello back".into()).unwrap())
            .unwrap(),
        "Hello back"
    );
}

#[test]
fn rejects_replay_and_accepts_reordering_once() {
    let (alice, bob) = pair();
    let first = alice.encrypt("First".into()).unwrap();
    let second = alice.encrypt("Second".into()).unwrap();
    assert_eq!(bob.decrypt(second).unwrap(), "Second");
    assert_eq!(bob.decrypt(first.clone()).unwrap(), "First");
    assert_eq!(bob.decrypt(first), Err(ChatError::Message));
}

#[test]
fn rejects_generation_jumps_beyond_forward_limit() {
    let (alice, bob) = pair();
    for _ in 0..101 {
        alice.encrypt("Skipped".into()).unwrap();
    }
    assert_eq!(
        bob.decrypt(alice.encrypt("Too far ahead".into()).unwrap()),
        Err(ChatError::Message)
    );
}

#[test]
fn rejects_messages_older_than_reordering_window() {
    let (alice, bob) = pair();
    let first = alice.encrypt("Too old".into()).unwrap();
    for _ in 0..12 {
        alice.encrypt("Skipped".into()).unwrap();
    }
    assert_eq!(
        bob.decrypt(alice.encrypt("Latest".into()).unwrap())
            .unwrap(),
        "Latest"
    );
    assert_eq!(bob.decrypt(first), Err(ChatError::Message));
}

#[test]
fn rejects_tampering_and_trailing_bytes() {
    let (alice, bob) = pair();
    let original = alice.encrypt("Private".into()).unwrap();
    let mut tampered = original.clone();
    let last = tampered.len() - 1;
    tampered[last] ^= 1;
    assert_eq!(bob.decrypt(tampered), Err(ChatError::Message));
    let mut trailing = original.clone();
    trailing.push(0);
    assert_eq!(bob.decrypt(trailing), Err(ChatError::Message));
    // No promise that a corrupted generation is retryable: transport must
    // verify the immutable object before feeding bytes to the ratchet.
}

#[test]
fn rejects_wrong_group() {
    let (alice, _) = pair();
    let (_, other_bob) = pair();
    assert_eq!(
        other_bob.decrypt(alice.encrypt("Wrong conversation".into()).unwrap()),
        Err(ChatError::Message)
    );
}

#[test]
fn rejects_wrong_contact_package_and_corrupt_package() {
    let alice = chat(1, 2);
    let mallory = chat(3, 1);
    assert_eq!(
        alice.initiate(mallory.key_package().unwrap()),
        Err(ChatError::Peer)
    );
    assert_eq!(alice.initiate(vec![0; 100]), Err(ChatError::Message));
    // A rejected package does not prevent a legitimate handshake.
    let bob = chat(2, 1);
    bob.join(alice.initiate(bob.key_package().unwrap()).unwrap())
        .unwrap();
}

#[test]
fn rejects_welcome_from_unexpected_sender() {
    let bob = chat(2, 1);
    let mallory = chat(3, 2);
    let welcome = mallory.initiate(bob.key_package().unwrap()).unwrap();
    assert_eq!(bob.join(welcome), Err(ChatError::Peer));
    assert_eq!(bob.encrypt("Not joined".into()), Err(ChatError::State));
}

#[test]
fn rejects_credential_that_claims_another_public_key() {
    let alice = chat(1, 2);
    let mallory = chat(3, 1);
    let forged = mallory
        .with_engine(|engine| {
            let mut credential = engine.credential.clone();
            credential.credential = BasicCredential::new(identity(2).into_bytes()).into();
            let package = KeyPackage::builder()
                .build(SUITE, &engine.provider, &engine.signer, credential)
                .unwrap();
            Ok(package.key_package().tls_serialize_detached().unwrap())
        })
        .unwrap();
    assert_eq!(alice.initiate(forged), Err(ChatError::Peer));
}

#[test]
fn rejects_welcome_with_third_member() {
    let alice = chat(1, 2);
    let bob = chat(2, 1);
    let charlie = chat(3, 1);
    let packages = [bob.key_package().unwrap(), charlie.key_package().unwrap()];
    let welcome = alice
        .with_engine(|engine| {
            let mut group = MlsGroup::builder()
                .ciphersuite(SUITE)
                .use_ratchet_tree_extension(true)
                .build(&engine.provider, &engine.signer, engine.credential.clone())
                .unwrap();
            let packages: Vec<_> = packages
                .into_iter()
                .map(|wire| {
                    KeyPackageIn::tls_deserialize_exact(wire)
                        .unwrap()
                        .validate(engine.provider.crypto(), ProtocolVersion::Mls10)
                        .unwrap()
                })
                .collect();
            let (_, welcome, _) = group
                .add_members(&engine.provider, &engine.signer, &packages)
                .unwrap();
            Ok(welcome.tls_serialize_detached().unwrap())
        })
        .unwrap();
    assert_eq!(bob.join(welcome), Err(ChatError::Peer));
}

#[test]
fn validates_identity_and_state() {
    assert!(matches!(
        PrivateChat::new(vec![1; 31], identity(2)),
        Err(ChatError::Identity)
    ));
    assert!(matches!(
        PrivateChat::new(vec![1; 32], "invalid".into()),
        Err(ChatError::Identity)
    ));
    assert!(matches!(
        PrivateChat::new(vec![1; 32], identity(1)),
        Err(ChatError::Peer)
    ));
    let alice = chat(1, 2);
    assert_eq!(alice.encrypt("Not joined".into()), Err(ChatError::State));
    alice.key_package().unwrap();
    assert_eq!(alice.key_package(), Err(ChatError::State));
    let (alice, bob) = pair();
    assert_eq!(alice.key_package(), Err(ChatError::State));
    assert_eq!(bob.join(vec![0; 100]), Err(ChatError::State));
}

#[test]
fn bounds_inputs_by_bytes_and_closes_idempotently() {
    let (alice, bob) = pair();
    assert_eq!(alice.encrypt(String::new()), Err(ChatError::Limit));
    assert_eq!(alice.encrypt("🌈".repeat(1025)), Err(ChatError::Limit));
    let maximum = "x".repeat(MAX_TEXT);
    assert_eq!(
        bob.decrypt(alice.encrypt(maximum.clone()).unwrap())
            .unwrap(),
        maximum
    );
    assert_eq!(bob.decrypt(vec![0; MAX_WIRE + 1]), Err(ChatError::Limit));
    assert_eq!(bob.join(vec![0; MAX_WIRE + 1]), Err(ChatError::Limit));
    assert_eq!(alice.initiate(vec![0; MAX_WIRE + 1]), Err(ChatError::Limit));
    alice.shutdown().unwrap();
    alice.shutdown().unwrap();
    assert_eq!(alice.key_package(), Err(ChatError::Closed));
    assert_eq!(alice.encrypt("Closed".into()), Err(ChatError::Closed));
    assert_eq!(alice.decrypt(vec![0; 100]), Err(ChatError::Closed));
}
