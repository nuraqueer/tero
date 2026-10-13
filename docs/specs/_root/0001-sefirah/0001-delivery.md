# Encrypted fallback delivery experiment

## Summary

Prove that one client can publish encrypted data and another can fetch it later without the sender remaining online. Keep this development service separate from current boards and off by default. This is the fallback component, not a substitute for building Sefirah's primary route.

## Feature design

### Client object

`SealedObject` has `version: 1`, `id`, `expiresAt` (integer UTC milliseconds), and `box` (canonical unpadded base64url). The locator is SHA256 of UTF8 JSON `["sefirah-object/v1", expiresAt, box]`, encoded as base64url. Hashing ciphertext avoids creating a public fingerprint of plaintext.

Inside the existing padded XChaCha20 Poly1305 sealed box, store `{version: 1, author, text, signature}`. The author is a did:key derived from the signing key. Ed25519 signs UTF8 JSON `["sefirah-post/v1", author, expiresAt, text]`. The box context is `sefirah-post/v1`. Fixed arrays define exact signing bytes without an ambiguous object serialization rule.

`sealPost(key, signingSecret, text, expiresAt)` produces the object. `openPost(key, object, expectedAuthor, now)` checks shape, content hash, expiry, decryption, schema, expected author, and signature, returning the verified author and text or null. `expectedAuthor` is supplied by the receiving application's authorised context, never trusted solely from the object. Signatures prove key possession, not membership or professional authority.

No production recipient key exchange or permission model is inferred from this helper. Tests use an explicitly shared random 32-byte key. Do not derive a global community key from a public identifier or reuse an identity secret as a content key.

### Storage

Sixteen deterministic buckets are selected from the first base64url digit of the validated content hash, modulo sixteen. Each bucket stores objects in SQLite with fields `id` primary key, `box`, `expires_at`, `stored_at`. No plaintext, author DID, recipient list, or content key is stored in object rows. There is no listing endpoint.

The experiment limits each bucket to 512 KiB of box text and 128 live objects. Each object box is at most 64 KiB. Test retention is at most 24 hours from first upload and must be chosen explicitly by the test sender; uploads cannot extend an existing receipt. These limits are not approved retention for real member content. Per bucket, a maximum of ten new objects per authenticated uploader per UTC day is enforced through a keyed pseudonym and an expiring quota row. Quota metadata can reveal activity to the operator and is not a private governance record. Maximum member uploads across all buckets are therefore 160 per day.

On a write, validate before any insert, remove expired records, check duplicates, then check byte/count/quota limits. Operations are synchronous within one Durable Object request. Bound cleanup to 128 object rows per bucket and at most 1024 quota rows. Reuse a fixed number of buckets so an attacker cannot create unbounded namespaces through chosen IDs. Reject new uploads when quota metadata is full. Reads do not delete live objects. Expired reads return not found. Expired physical data is reclaimed on later writes; idle cleanup is not promised in this experiment. Provider backups are separate from live API expiry.

### API surface

| Endpoint                   | Method | Input                         | Output                                          | Access                                                                        | Errors                                                                                                                     |
| -------------------------- | ------ | ----------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `/api/sefirah/objects/:id` | PUT    | SealedObject matching path ID | `{id, storedAt, expiresAt}` after SQLite insert | Existing session and current membership, transitional only                    | 400 invalid, 401 unauthenticated, 403 not member, 413 body too large, 429 quota, 503 disabled/capacity/storage unavailable |
| `/api/sefirah/objects/:id` | GET    | Known object locator          | SealedObject                                    | Existing session and current membership; encryption controls plaintext access | 401 unauthenticated, 403 not member, 404 absent/expired, 503 disabled/unavailable                                          |

`SEFIRAH_EXPERIMENTAL=enabled` is required. Absent or any other value leaves routes disabled. `SEFIRAH_FALLBACK` is a separate SQLite Durable Object binding. Existing `AUTH_SECRET` supplies session verification and the quota pseudonym key. The feature has no application caller yet.

The Worker bounds the actual streamed PUT body to 70 KiB before JSON parsing, including when Content-Length is absent or false. No persistent sensitive logs are added. Storage errors return generic 503 without falsely acknowledging an object. Responses retain the existing security and no-store headers.

### Value sourcing

| Value                         | Source                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| Author                        | Public key derived from sender signing secret, encoded as did:key |
| Signature                     | Existing Ed25519 signer over the specified array                  |
| Box                           | Existing padded sealText with caller's random content key         |
| ID                            | SHA256 over version domain, expiry, and box                       |
| Expiry                        | Explicit sender input, bounded by the experiment on upload        |
| Stored time                   | Server clock on the first successful insert                       |
| Reader time / expected author | Explicit receiving context inputs                                 |
| Bucket                        | Validated ID first digit modulo sixteen                           |
| Quota owner/day               | HMAC pseudonym of authenticated uploader and UTC day              |
| Enabled state                 | Explicit deployment flag, disabled by default                     |

### Critical test scenarios

- AC-1: decrypt and verify with the right key and expected author; reject wrong key, wrong author, altered ciphertext/expiry/signature, malformed input, and expired data.
- AC-2: write to real SQLite, reconstruct the store, and retrieve from a later recipient session; repeated reads preserve the object.
- AC-3: duplicates preserve the first receipt and do not spend another quota slot; limits reject rather than evict; expiry reclaims capacity without resetting daily quotas.
- AC-4: exercise HTTP gating, membership checks, bounded streaming input, unsupported methods, and malformed IDs; existing tests remain green.

## Rationale

An immutable encrypted object is a small common unit for future peer and fallback routes. Keeping the signature inside encryption avoids giving the carrier a plaintext author field. A bounded, disabled experiment lets us test storage failures without making a retention decision for real users or replacing the current app prematurely.

## Reproduce locally

Use a fresh local persistence directory and dummy accounts, not a production account. From `apps/edge`, run `bunx wrangler dev --local --port 8793 --persist-to /tmp/tero-sefirah-demo --var AUTH_SECRET:local-development-only-0123456789012345 --var SEFIRAH_EXPERIMENTAL:enabled`. The existing web assets directory must exist, or pass `--assets` pointing to a local web export.

From the repository root, run `bun scripts/sefirah-fallback-demo.ts publish`. Stop Wrangler, restart it with the same arguments and persistence directory, then run `bun scripts/sefirah-fallback-demo.ts read`. The sender process has exited before the reader starts. The script accepts a different localhost URL and fixture path as subsequent arguments. The temporary fixture contains a development content key and should be removed after testing.

Run `bun scripts/sefirah-tor-smoke.ts` separately for the native desktop connectivity spike. It requires a Tor executable and curl; `SEFIRAH_TOR_BINARY` can point to an extracted local executable. It starts two isolated Tor clients, serves one encrypted test object through a temporary v3 onion service, fetches it through SOCKS with remote hostname resolution, and verifies the signature. It has no Cloudflare fallback, direct connection fallback, or application caller. Only synthetic data is served. This is a single machine test, not evidence of mobile support. Temporary processes and service keys are removed on normal completion or handled failure.
