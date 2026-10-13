# 0004. Explicit fallback transport

**Date**: 2026-10-13

## Decision

Connect the encrypted device outbox to the existing disabled fallback API through a separate transport adapter. The adapter is labelled `cloudflare`. It does not select routes, discover peers, retry automatically, or start sending on unlock. Existing app content is not migrated.

The app exposes the adapter through its authenticated API only when `EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL=enabled`. The Worker independently requires its existing server flag. A development flag is not an authorization boundary. Existing central membership and bearer authentication remain transitional requirements.

## Inputs and validation

The configured API origin is the existing app API base. Empty base means the web app's same origin. Explicit origins must be HTTPS, except loopback HTTP for local development. Credentials, paths, query strings, and fragments in explicit origins are rejected. Member supplied peer addresses must never use this adapter.

Use the existing in memory session bearer token, with redirects rejected, cookies omitted, cache disabled, and a 30 second request deadline. Mobile uses an explicit `expo/fetch` import for streaming behavior. Upload body is the already sealed immutable object; no content key, plaintext, or author signature is added outside its encryption.

Reads stream into a fixed 70 KiB buffer rather than trusting Content-Length or buffering unlimited bytes. Successful replies must parse as JSON. Upload receipts must contain exactly the expected object ID and expiry and a valid storage timestamp. Downloads must pass the existing sealed object shape and hash checks, match the requested locator, and be unexpired. A recipient must still use `openPost` with its content key and independently expected author. The HTTP adapter cannot establish recipient authorization or hide IP metadata from Cloudflare.

Non-success HTTP status, network failure, timeout, cancellation, and invalid response are distinguishable. Untrusted response error text is not surfaced. There is no automatic retry on 401, 429, or 503. The outbox keeps pending work on failure; callers can arrange a later retry after connectivity, authentication, or capacity recovers.

Uploads through `outbox.deliver` receive its abort signal, so lock, decoy, or removal cancels the request and prevents a late local receipt update. Direct retrieval callers own their abort signal and must cancel on their own session teardown. No retrieval screen is wired in this slice. Cancellation cannot recall bytes already received by the remote service.

## Verification

Eight HTTP adapter tests cover actual loopback upload and retrieval, queue receipt reconstruction, redirect blocking, error status, response validation, bounded chunked bodies, cancellation during a stalled real response, timeout, and invalid origins. The localhost demonstration uses the same adapter and an encrypted file backed outbox, then separately retrieves and decrypts after a local Worker restart. This is desktop runtime evidence, not native phone execution or a primary Sefirah route.

Reference checked for platform streaming: [Expo 57 fetch](https://docs.expo.dev/versions/v57.0.0/sdk/expo/#expofetch-api). The installed native fetch source was inspected for redirect handling.

## Implementation evidence

The local Worker demonstration passed using real Durable Object SQLite persistence. The sender reopened its encrypted file queue and uploaded using this adapter. After the Worker was stopped and restarted against the same persistence directory, a separate recipient process retrieved and verified the object twice. The local Worker was stopped after verification. All 176 tests across 22 files pass; app and script TypeScript pass; iOS, Android, and web exports with the app development flag enabled pass. Lint remains unavailable for the previously recorded missing ESLint configuration and unavailable Bun. No paid service, production deployment, primary transport, or native runtime verification is claimed.
