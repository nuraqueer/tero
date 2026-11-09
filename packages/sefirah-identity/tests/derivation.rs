use sefirah_identity::derive_native_secret;

#[test]
fn native_identity_and_message_keys_are_separated() {
    let seed = [7_u8; 64];
    let identity = derive_native_secret(&seed, "identity", 0).unwrap();
    let message = derive_native_secret(&seed, "app", 5).unwrap();
    assert_ne!(&identity[..], &message[..]);
    assert_eq!(identity.len(), 32);
    assert_eq!(message.len(), 32);
    let hex = |key: &[u8]| key.iter().map(|byte| format!("{byte:02x}")).collect::<String>();
    assert_eq!(hex(&identity), "b04c7a459253171bbb2d285ade58cd2ecbdcdb64dde514478ab6c38835df0c17");
    assert_eq!(hex(&message), "55356a4b61ebf4440784cde1f5ee083cebaf8830997a051f5dc97183d3a3bf47");
    assert_ne!(&identity[..], &derive_native_secret(&[8_u8; 64], "identity", 0).unwrap()[..]);
}

#[test]
fn unrecognised_purposes_are_rejected() {
    let seed = [3_u8; 64];
    assert!(derive_native_secret(&seed, "unknown", 0).is_err());
}
