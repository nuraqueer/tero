//! Synthetic identities only. Does not read the app's vault or use the network.
use ed25519_dalek::SigningKey;
use sefirah_mls::{ChatError, PrivateChat};

fn identity(seed: u8) -> String {
    let key = SigningKey::from_bytes(&[seed; 32]);
    let mut bytes = vec![0xed, 0x01];
    bytes.extend_from_slice(&key.verifying_key().to_bytes());
    format!("did:key:z{}", bs58::encode(bytes).into_string())
}

fn main() -> Result<(), ChatError> {
    let alice = PrivateChat::new(vec![1; 32], identity(2))?;
    let bob = PrivateChat::new(vec![2; 32], identity(1))?;
    bob.join(alice.initiate(bob.key_package()?)?)?;
    let wire = alice.encrypt("Synthetic Android MLS check 🌈".into())?;
    assert_eq!(bob.decrypt(wire.clone())?, "Synthetic Android MLS check 🌈");
    assert_eq!(bob.decrypt(wire), Err(ChatError::Message));
    assert_eq!(alice.decrypt(bob.encrypt("Reply".into())?)?, "Reply");
    alice.shutdown()?;
    bob.shutdown()?;
    assert_eq!(alice.encrypt("Closed".into()), Err(ChatError::Closed));
    println!("PASS: native MLS handshake, two-way encryption, replay rejection, close");
    Ok(())
}
