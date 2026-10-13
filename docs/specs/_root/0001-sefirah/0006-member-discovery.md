# Member discovery and connections

Status: In Progress

## Founder requirements

Permanent unique account handle, editable display name, distinct Tarot card. Circles shows Network, Contacts and Following, followed by groups, channels and conversations. Search is available across members. Connections require acceptance. Following applies only to verified professionals. Leadership badges stay private.

## Development decision

Extend the existing transitional registry, with no new hosting provider. Profiles are signed by their owner and encrypted with a private directory key. Search and decryption happen on admitted members' devices. A keyed handle identifier reserves the normalized handle without giving the carrier a plaintext handle index. Handles use 3 to 24 lowercase ASCII letters, digits, hyphens and underscores, starting with a letter; strip an optional leading @. The editor shows @la-niina and La niina examples, validates input as it is typed and checks availability after a short pause. An authenticated PUT /api/discovery/handle accepts only the directory identifier and keyed handle identifier, never the plaintext handle, and returns availability without reserving it. Saving still enforces uniqueness. Display names accept Unicode, 1 to 64 characters, without control characters.

The Fool bootstraps a random directory key once. It is wrapped individually for each admitted account using X25519, HKDF and the existing padded XChaCha20 Poly1305 box. Ed25519 keys use the installed Noble conversion utilities. Grants bind sender, recipient and directory identifier and are signed. A recipient verifies the grant and directory key fingerprint before use. Any admitted member with an existing grant may grant that same key to another admitted member. A new member can wait for an existing member to open the app. No separate setup is required. Only the authenticated recipient can retrieve their grant. Private directory keys remain in session memory; recovery uses the identity encrypted grant retained by the registry.

Profiles include owner, normalized handle, display name and revision. Their signature binds the ciphertext, owner, permanent handle identifier, directory identifier and monotonically increasing revision. The server verifies the owner signature and enforces immutable handle claims and compare and swap revisions. Clients also verify signature and recompute the handle identifier after decrypting. The server stores no plaintext name or handle. Directory pages contain only account identity, Tarot card, Sequence and signed encrypted profile. No leadership role or invitation ancestry is included. Clients display unnamed members by their card until they set up a profile.

Connection requests are authenticated pair state transitions: outgoing pending, incoming pending, accepted, or removed. Only the recipient accepts; both can remove or decline. Reverse requests do not silently accept. Duplicate actions are idempotent. These transitional coordination rows reveal connection metadata to the registry, never to unrelated members. No message content is stored. This is an explicit remaining privacy boundary, not full Sefirah governance. Contacts show only accepted connections. Following is reserved for verified professionals; no unverified account can self assign a professional badge. Professional appointment remains separate work.

## Bounds and lifecycle

Directory responses are paged at 100 members. Profile payloads are at most 8 KiB; grants at most 4 KiB. Request bodies are bounded before JSON parsing. Profile and connection mutations require membership. Lists have no public access and no caching. Foreground and explicit refresh load updates, with no continuous background polling. Session lock unmounts discovery state and late completions cannot repopulate it. No personal data is seeded or permanent handle claimed by the agent on a real user's behalf.

## Checks

Key wrapping rejects wrong recipient, sender, directory and tampering. Profile signatures and ciphertext reject substitution and wrong keys. Registry tests cover admission, unique immutable handles, version conflicts, pair authorization, unrelated member privacy and limits. App checks cover error and empty states, editable display name, permanent handle confirmation, search and real connection actions. Physical two device verification needs the users to choose and save their own handles.

## Remaining boundaries

This directory key is shared with all admitted members because profiles are discoverable by all members. It is not a private conversation key. Revoking a member requires a future directory epoch rotation; already decrypted profiles cannot be recalled. Current central membership trust, key grant availability, malicious admitted member disclosure, rollback by a compromised carrier and scalable encrypted search are not solved by this slice. Messaging, professional appointment, automatic Tor discovery and peer replication remain separate work.
