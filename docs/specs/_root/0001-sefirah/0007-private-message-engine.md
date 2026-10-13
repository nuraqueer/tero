# 0007 · Private message engine

Status: foundation in progress, implementing the existing D39 decision.
Date: 2026-10-13.

## Scope

Use official OpenMLS with our own UniFFI interface, as selected in
[D39](../../../messaging-choice.md). This first slice is an in-memory native
engine for a conversation between exactly two account identities. It does not
enable messaging in the app or introduce a custom cryptographic protocol.

Inputs are the unlocked account's Ed25519 signing seed, the expected contact's
Ed25519 did:key, an OpenMLS KeyPackage or Welcome, and UTF-8 text. Credentials
contain canonical account DIDs and must match their MLS signing public keys.
The caller is responsible for checking accepted contact status before creating
an engine. A DID/key match is identity authentication, not proof of admission.

The interface permits one KeyPackage and one group per engine. A Welcome must
contain exactly the local identity and expected peer. Only private application
messages are accepted in this slice; membership changes and epoch updates are
not implemented. Explicit close drops the engine and prevents further use.
Keys and plaintext are never exported to a carrier, logged, or persisted here.
Dropping state is not a guarantee of complete memory erasure.

Engineering limits: 4 KiB UTF-8 text, 64 KiB incoming MLS wire message, 256-byte
MLS padding blocks, ten out-of-order generations and a maximum forward distance
of 100. These bound this experiment, not final product policy.

## Verification

- Two independent engines establish a group and exchange encrypted text both ways.
- Wrong-peer KeyPackages and Welcome groups are rejected.
- Invalid DID/key bindings, third members, corruption, replay, wrong-group
  messages, oversized inputs and calls after close are rejected.
- Reordered messages within the configured window can be read once each.

## Remaining work

### Mobile binding slice

Generate Kotlin bindings from the compiled UniFFI metadata, then expose an
Android Expo module only in `SEFIRAH_NATIVE_BUILD=1` builds. Ordinary builds have
an unavailable stub; Expo Go has no module. No custom JNI cryptographic wrapper
replaces UniFFI. Kotlin's generated bindings use the JNA runtime dependency.
Use native-generated opaque handles with at most 16 active engines per module.
Operations and close are serialized. The JS session owner closes every engine
on lock, decoy entry, account replacement and unmount. A closed owner cannot
create another engine. No chat screen or network caller is enabled by this slice.
Validate the bridge with synthetic accounts, never the founder's live keys.

Android bindings and session cleanup are implemented. Encrypted local state is
implemented in [0008](0008-message-state.md), with explicit limitations. Remaining:
iOS binding, power-loss verification, accepted-contact enforcement, KeyPackage distribution,
simultaneous initiation, epoch updates, authenticated message IDs and receipts,
Sefirah delivery and fallback integration, chat UI, attachments and expiry.
The agreed default is 24 hours after both people read a private message; messages
still unread after seven days are deleted (founder's corrected rule, 2026-10-13).
Read timers require authenticated receipts and are not implemented in this engine.
This slice makes no restart safety,
post-compromise healing, production readiness or device-to-device delivery claim.

## Implementation evidence

The Rust engine and UniFFI export interface are implemented under
`apps/app/modules/sefirah-mls/native`. Twelve host tests pass, including key/DID
substitution, third-member rejection, corruption, wrong group, replay, reordering
and ratchet distance limits. Rust formatting and strict Clippy pass. A separate
path-filtered CI workflow runs these checks; it has not been run on GitHub yet.

An Android arm64 shared library and standalone probe compiled using the installed
NDK. The probe ran successfully on the connected TECNO Android device using two
synthetic identities in one process: Welcome handshake, encrypted text both ways,
replay rejection and close. The temporary executable was then removed. It did
not access the app vault, network or registry. This is native core execution,
not an Expo/UniFFI mobile bridge check or exchange between two physical devices.

All six existing workspace TypeScript checks pass. Existing app ESLint reports
unrelated baseline errors; no existing TypeScript implementation was changed in
this slice. That first engine slice did not change the installed app or published iPhone preview.


### Android app bridge evidence

The Kotlin UniFFI bindings, gated Android Expo module and session-owned JS adapter
are now implemented. The Rust shutdown method is named `shutdown`, reserving
Kotlin `close` for UniFFI object disposal. Generated bindings use JNA 5.18.1.
The native module caps engines at 16 and serializes operations with disposal.
Lock, decoy entry, account replacement and unmount close the JS session owner.
Five new ownership tests pass; the existing workspace suite now has 225 tests
across 31 files, and all six workspace type checks pass. Targeted app lint,
12 Rust tests, Rust formatting and strict Clippy pass.

The enabled Android APK built and installed as an update, preserving the Fool
vault. After the founder unlocked Tero, the Sefirah diagnostic button passed
through JavaScript → Expo/Kotlin → generated UniFFI → OpenMLS/Rust on the physical
TECNO: handshake, encrypted text both ways and replay rejection. These are
synthetic identities in one process, not two-device delivery or persistent chat.
A screenshot is available locally at `/tmp/tero-mls-bridge-pass.png`. The disabled
Android stub compiles too, and the SDK 57 iOS JavaScript export succeeds. No new
iPhone update or Cloudflare deployment was published. iOS native binding, crash
safe encrypted state, transport and real chat UI remain unbuilt.


Subsequent storage work is recorded in [0008](0008-message-state.md), which
supersedes the earlier in-memory-only boundary for persistent opens. The original
`new` constructor remains ephemeral for synthetic protocol tests.
