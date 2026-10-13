# 0003. Encrypted device outbox

**Date**: 2026-10-13

## Decision and boundaries

Add a bounded development outbox to the full session behind `EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL=enabled`. It accepts already sealed immutable objects, not plaintext drafts or recipient keys. Existing screens do not call it. Transport selection and recipient key distribution remain separate work. This is partial progress on AC-5, not completion of that criterion.

Use the existing `sealText` and `openText`, with a dedicated context and `deriveSecret(seed, 'app', 1)` key. Name the per account store using an existing keyed pseudonym derived separately from `deriveSecret(seed, 'app', 2)` and the identity DID. Neither seed nor encryption key is written beside the queue. Recovery words can derive the key again; this does not provide forward secrecy or hide the existence of app files.

Native storage uses the already installed Expo 57 FileSystem, in the app document directory. Web uses localStorage and its existing browser security limitations. Two alternating encrypted snapshots retain the preceding revision while writing the next. Each write is read back before the method reports success. A torn slot can recover the other authenticated snapshot and reports `recovered`; two unreadable slots fail closed and are never silently reset. This is application restart protection, not a filesystem fsync guarantee, rollback detection, secure deletion, backup protection, or concurrent process support. One live writer per account is required.

## Values and behavior

- Object ID, encrypted bytes, and expiry come from `SealedObject`. Reject invalid or already expired input; never encrypt again on retry.
- Snapshot revision starts at zero, increases after each change, and is inside authenticated encryption.
- Development capacity is 32 objects and 512 KiB serialized snapshot plaintext, with a 1 MiB read bound per encrypted slot. Exhaustion rejects new work without removing accepted objects.
- Delivery receipts come from an explicitly supplied carrier, labelled `sefirah`, `cloudflare`, or `nearby`. No automatic route selection or direct IP connection is introduced. A receipt must match object ID and expiry, and have a positive safe integer storage time before expiry. It means carrier storage, not recipient receipt. One receipt per route is retained; other routes can still receive the same object.
- Failed or interrupted delivery leaves the object queued. Successful carrier storage followed by a local write failure may cause a safe duplicate retry. Expired objects are not sent and remain visible until explicitly removed.
- The owner explicitly removes an entry. Capacity pressure does not remove entries automatically.
- Lock, decoy entry, and replacement of a full session close the outbox synchronously, clear its key and object references, and abort active sends. Late answers cannot update persistence. Aborting cannot recall bytes already sent.
- Opening the full session does not send anything. There is no timer, background delivery, or automatic Cloudflare fallback in this slice.
- A damaged outbox does not prevent vault unlock; the full session exposes a storage error and no outbox. Development callers must inspect recovery/error state.

## Verification

Exercise real encryption with file backed persistence across reconstruction, unchanged object IDs on retries, interrupted writes, wrong keys, capacity rejection, invalid receipts, overlapping sends, and lock during a delayed send. Typecheck the app and bundle both platform adapters. A real phone restart remains required before claiming native runtime verification. No new native dependency or deployment is required.

## Implementation evidence

Implemented in `apps/app/src/lib/sefirah-outbox.ts`, the two platform storage adapters, and `session.tsx`. Eleven tests use real encrypted files and exercise restart, uncertain delivery, interrupted writes, readback failure, wrong keys, byte and object capacity, receipt validation, expiry, cancellation, and removal during a send. The whole suite passes 168 tests across 21 files. App TypeScript and changed code formatting pass. iOS, Android, and web exports succeed with the development flag both disabled and enabled. Lint was attempted but is unavailable because the repo has no ESLint setup and the automatic install cannot run without Bun. No device runtime or network integration is claimed.

API reference checked before writing the native adapter: [Expo 57 FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/). Native `File.write` implementation was also inspected to confirm creation of missing slot files.
