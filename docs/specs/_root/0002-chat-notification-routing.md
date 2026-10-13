# Chat notification routing

Status: Assumed implementation, 14 October 2026. Owner requested that tapping a
notification open its conversation and explicitly chose to show sender names.

The push title comes from the sender's decrypted self profile, supplied on an
authenticated message publish. It is optional, limited to 80 characters and
rejects control characters. Older senders fall back to Tero. The message body
stays generic. This exposes the name to the push provider, as approved by the
owner; it is not a verified identity assertion.

The server seals a routing pointer containing sender DID and message expiry.
It uses the existing authenticated encryption helper with a separate purpose
and a recipient specific key derived from the existing auth secret. The push
provider and push storage see ciphertext, not a raw DID. The wake row retains
the encrypted pointer independently of mailbox consumption, with the existing
bounded lifetime and queue limits. No new secret or account registry is made.

On tap after unlock and connection, the recipient posts the pointer to the
authenticated `/api/push/open` route. The service decrypts with the current
recipient key, checks expiry and a current accepted connection, then returns
the peer. The app opens that conversation, which retains its normal access
check and scroll to latest behavior. Old, expired, wrong account, revoked or
unavailable routes fall back to Messages. No private message is marked read
merely by resolving the pointer.

The Android notification icon is a dedicated 96 pixel white transparent card
and star asset rendered from the editable SVG. Android system alerts include
high priority and the system sound. Existing device sound, Do Not Disturb and
channel choices remain authoritative. iOS requires its APNs service key and a
TestFlight build containing the new client behavior.

Focused type/lint and actual owner device evidence are used; no full suite is
authorized. Routing, sender title and new icon need owner confirmation after
the corresponding app updates. This spec records the chosen implementation;
it does not claim all notification lifecycle cases are verified.
