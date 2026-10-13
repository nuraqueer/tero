# 0008 · Native message state

Status: in progress, development foundation.
Date: 2026-10-13.

## Decision and boundary

Persist the existing native OpenMLS memory provider's current key/value state
inside an authenticated encrypted record in local SQLite. Use rusqlite with
bundled SQLite, serde for bounded serialization, and XChaCha20 Poly1305, the
existing device encryption family. This avoids a custom MLS storage trait and
keeps plaintext state out of JavaScript and platform file APIs. The official
SQLite provider was considered, but its static Codec interface cannot carry a
separate account encryption key without another database encryption dependency.

The engine receives a separate 32 byte storage key derived from the unlocked
vault, not a passcode or phrase. Android chooses an opaque namespace inside
noBackupFilesDir. Storage must be excluded from automatic backups. The initial
API remains a development foundation, with no real message screen or transport.

## Atomic operations

Each successful KeyPackage creation, initiation, join, encryption or decryption
commits the updated OpenMLS state before returning. Encryption also queues the
exact outgoing wire bytes in that commit. Decryption stores plaintext in an
encrypted inbox in the same commit, so a crash after commit does not lose the
received text. Public APIs may list pending encrypted bytes or received text;
they never export the state snapshot or storage key.

Wire IDs are SHA256 of exact MLS bytes, for local queue identity only, not
delivery or read receipts. Limits are 32 pending records, 32 inbox records and
4 MiB serialized state per conversation, for this experiment. Capacity rejects
new work and never evicts accepted data. Retention and authenticated receipts
must be connected before real member messages are enabled.

SQLite BEGIN IMMEDIATE, synchronous FULL and a conditional revision advance
protect commits. A competing or stale engine cannot commit a second result from
an old ratchet. Failure after mutation permanently closes that in-memory engine;
the caller must reopen persisted state. No output is released before commit.
Reopening restores the current authenticated state and checks local and peer
identity plus exact two-member group membership. A wrong key, corrupt record or
malformed state fails closed. There is no fallback to an older snapshot.

## Limits of the guarantee

SQLite journals and flash storage may retain old encrypted pages. The storage
key can decrypt historical copies if captured together with them. This slice
does not promise forensic erasure, resistance to an attacker restoring an old
database, or safe migration from copied backups. Native noBackup storage reduces
accidental backup, not malicious rollback. Epoch updates and post-compromise
healing remain unbuilt. Crash durability depends on the filesystem honoring
SQLite flush requests. The record schema and OpenMLS version are fixed together;
unsupported versions must fail rather than silently create an empty chat.

## Verification

Reopen before and after each handshake step; exchange text after restart; retain
exact pending ciphertext and encrypted inbox; reject replay after restart,
wrong keys, tampering, wrong identities, full queues and stale writers. Prove a
failed persistence attempt releases neither ciphertext nor plaintext. Inspect
database and journal bytes for synthetic plaintext and account DIDs. Run the
same restart probe on Android before claiming mobile persistence.


## Mobile integration

The full session derives a storage key using existing HKDF purpose `app`, index
5. The JS manager owns a copy and wipes it on lock/close; each native open gets a
temporary copy. Namespaces use the existing HMAC pseudonym helper keyed by that
storage key, context `private-message-state/v1`, and the local and peer DIDs.
The Android bridge chooses the actual private file path and rejects duplicate
active handles for one file. The bridge advertises storageVersion 1; older
binaries cannot silently substitute ephemeral engines. Real callers must still
require an accepted contact before creating a conversation.

The synthetic diagnostic uses random storage keys and a separate cache directory,
not the account's no-backup directory. Cleanup can remove only those probe files
after their handles close. The operations remain synchronous for the development
probe; move disk work off the JS thread with a defined cancellation lifetime
before enabling real chat screens. Pending queue acknowledgement/consumption and
message retention remain unimplemented, so filling a test queue requires caller
handling rather than silent eviction.


## Implementation evidence

21 Rust tests pass, including the prior encryption suite and nine persistence
tests for handshake/message restarts, wrong keys and peers, tampering, stale
writers, failed sends and receives, full queues/inbox, plaintext absence and an
unsupported engine version. Strict Clippy and Rust formatting pass. All six
workspace type checks and all 228 workspace tests pass. Changed app lint passes.
The SDK 57 iOS JavaScript export succeeds; no iOS update was published.

On the physical TECNO, a synthetic standalone Android process committed state
and exited. A separate invocation reopened it, restored queued ciphertext,
decrypted it, recovered the encrypted inbox, replied and rejected replay. The
probe directory and executable were removed. This verifies process separation
and disk persistence, not a power cut during commit.

The updated APK built and installed over Tero Sefirah Dev, preserving the Fool
vault. The in-app synthetic diagnostic passed through JS, Kotlin, UniFFI and Rust
with saved handshake, reopened state, pending queue, inbox and replay rejection.
The synthetic cache directory contained no files afterward. A local screenshot
is `/tmp/tero-mls-state-pass.png` (the earlier diagnostic wording said “restart
delivery”, which was corrected to “reopened state” to avoid implying networking).
No account key or real conversation was used. Real conversations, receipt/expiry
enforcement, queue consumption, native iOS and network delivery remain unbuilt.
