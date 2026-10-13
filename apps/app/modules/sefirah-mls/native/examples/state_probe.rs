//! Two-process persistence check, synthetic identities only, no app vault access.
use ed25519_dalek::SigningKey;
use sefirah_mls::{ChatError, PendingKind, PrivateChat};
use std::{path::Path, sync::Arc};

fn identity(seed: u8) -> String {
    let mut bytes = vec![0xed, 0x01];
    bytes.extend_from_slice(
        &SigningKey::from_bytes(&[seed; 32])
            .verifying_key()
            .to_bytes(),
    );
    format!("did:key:z{}", bs58::encode(bytes).into_string())
}
fn open(root: &Path, own: u8, peer: u8) -> Result<Arc<PrivateChat>, ChatError> {
    PrivateChat::open(
        vec![own; 32],
        identity(peer),
        vec![own + 10; 32],
        root.join(format!("{own}.db"))
            .to_str()
            .ok_or(ChatError::Storage)?
            .into(),
    )
}
fn main() -> Result<(), ChatError> {
    let arguments: Vec<_> = std::env::args().collect();
    let root = Path::new(arguments.get(1).ok_or(ChatError::State)?);
    match arguments.get(2).map(String::as_str) {
        Some("prepare") => {
            let alice = open(root, 1, 2)?;
            let bob = open(root, 2, 1)?;
            bob.join(alice.initiate(bob.key_package()?)?)?;
            alice.encrypt("Synthetic cross-process message 🌈".into())?;
            alice.shutdown()?;
            bob.shutdown()?;
            println!("PASS: state and encrypted message committed before process exit");
        }
        Some("verify") => {
            let alice = open(root, 1, 2)?;
            let bob = open(root, 2, 1)?;
            let wire = alice
                .pending()?
                .into_iter()
                .find(|item| item.kind == PendingKind::Application)
                .ok_or(ChatError::State)?
                .wire;
            assert_eq!(
                bob.decrypt(wire.clone())?,
                "Synthetic cross-process message 🌈"
            );
            bob.shutdown()?;
            let bob = open(root, 2, 1)?;
            assert_eq!(
                bob.received()?[0].text,
                "Synthetic cross-process message 🌈"
            );
            assert_eq!(alice.decrypt(bob.encrypt("Reply".into())?)?, "Reply");
            assert_eq!(bob.decrypt(wire), Err(ChatError::Message));
            alice.shutdown()?;
            bob.shutdown()?;
            println!(
                "PASS: separate process restored state, queue, inbox, reply and replay protection"
            );
        }
        _ => return Err(ChatError::State),
    }
    Ok(())
}
