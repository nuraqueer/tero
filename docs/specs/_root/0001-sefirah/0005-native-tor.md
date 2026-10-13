# 0005. Native onion connectivity and private peer contacts

**Date**: 2026-10-13

## Decision

Use the Tor Project's Arti 0.47.0 Rust library directly, with a thin local Expo module. Start with Android arm64 and the connected TECNO device. The SDK and NDK are available locally. No required paid service, cloud build, VPN wrapper, public DHT, or clearnet peer route is introduced. iOS native binding is separate remaining work. Expo Go can continue running existing features but cannot load this custom transport.

This slice implements private online object retrieval, not the whole Sefirah network. The Android module runs an embedded Tor client and v3 onion service, accepts bounded encrypted offers from its own full session, and lets explicitly trusted peers retrieve them. It does not accept remote storage uploads, volunteer for others' data, acknowledge durable peer storage, or migrate chats or Help boards.

## Native boundary

Only v3 onion destinations on the fixed service port are accepted. No SOCKS or TCP listening socket is exposed to the local network. Arti guard connections still contact the Tor network and observers may detect Tor use. Bridges and pluggable transports are not configured in this slice. No global anonymity or unblockability guarantee is made.

Wire format is a four byte big endian JSON frame length followed by UTF-8 JSON, capped at 70 KiB. Requests are exactly `{v:1, op:"get", id, capability}`. Replies are exactly `{v:1, object}`. Objects use the existing sealed format and SHA256 identity. Rust rechecks size, shape, canonical base64, hash, and expiry. Recipients still verify encryption and expected author in TypeScript.

Development bounds are eight outgoing native jobs, four active rendezvous streams, eight application connections, 32 offered objects, and 512 KiB offered bytes. Offers are memory only, expire by object expiry, and disappear on stop. A successful offer is not a durable receipt. Inbound requests have a 30 second deadline; bootstrap and outgoing requests have a 180 second development deadline. No automatic retry or fallback occurs.

The module chooses app private no-backup storage for Arti guard, consensus, and onion state. It does not receive signing keys or post decryption keys. Tor files and connection activity are not deniable vault data. Onion keys persist and addresses can be linkable across app sessions. Full sessions own handles. Lock, decoy, replacement, and provider destruction stop the service and cancel jobs. Cancellation tombstones reject queued work after closure. Sanitized native errors do not expose paths, contacts, capabilities, or traffic contents. Extensive development cycling can exhaust the bounded cancellation budget and require app restart.

## Private contact discovery

A contact is `{version:1, owner, onion, capability, issuedAt, expiresAt, signature}`. Existing Ed25519 signs the fixed array beginning `sefirah-peer-contact/v1`. The owner is a DID, not a handle or tarot card. Import requires an independently trusted expected owner. Self signature alone is not membership or proof of a human identity.

The random 32 byte capability authorizes retrieval of known object locators. It is application access control, not Tor descriptor client authorization. It can leak or be copied; share contacts privately. Contacts expire after at most 24 hours, and the session capability stops working on close. Content keys require a separate authorised channel.

The private local directory encrypts contacts with `deriveSecret(seed, 'app', 3)` and a dedicated context. A separately derived index 4 key names its opaque account namespace. It reuses the two slot platform adapter, with at most 32 contacts and one current device contact per DID. Replacement requires a later issue time. Expired records cannot be used. This is a manually pinned directory. Automatic rendezvous, referral exchange, multiple devices per member, revocation distribution, and independent membership remain unbuilt.

## Development screen and build

`/sefirah` exists only for an open full native session with `EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL=enabled`. It offers a synthetic encrypted post and displays a private packet containing contact, locator, and test content key for the intended peer. Retrieval requires an independently entered expected DID. Packets must not be published. The screen does not send real member content or use Cloudflare.

`SEFIRAH_NATIVE_BUILD=1` generates a separate Android ID `org.pherus.tero.sefirahdev` and disables OTA updates for that install. It preserves the ordinary app and Expo Go. Module source lives under `modules/sefirah-tor`, not the generated application Android project. Gradle builds the locked Rust source with the installed NDK. Android arm64 is the initial target. A JS update to Expo Go cannot add this native dependency.

## Verification state

The JavaScript/backend suite passes 190 tests across 25 files, including signed contacts, encrypted contact persistence, and native bridge cancellation/closure. App TypeScript passes. These tests do not execute JNI or Tor.

The Android arm64 Rust library and core harness compiled. Initial execution on the physical TECNO exposed a Rustls startup panic because transitive dependencies enabled both TLS providers. Explicit ring provider initialization fixed that startup failure. The same physical device reproduction then passed: embedded Arti bootstrapped, fetched a signed encrypted object from a separate desktop C Tor peer, and served the object back over its own onion service. The recipient decrypted and verified the expected author in both directions. Cloudflare was not used. Temporary test processes and state were removed afterwards.

This proves core transport execution on the physical Android device, not Expo/JNI integration or app lifecycle behavior. The Expo module's Kotlin and Java compilation and the full Android debug APK build pass. The APK contains the arm64 Tor library (15,530,088 bytes), was installed on the explicitly selected physical TECNO as `org.pherus.tero.sefirahdev`, and opened successfully to the Tero welcome screen through Metro over USB. No account was restored or created for this UI check. Native Tor calls through the Expo/JNI screen, full session lock behavior on the phone, and iOS native support remain unverified or unbuilt. The ordinary iOS JavaScript export also passes; that does not add Tor to Expo Go. Lint remains unavailable because the repository has no installed/configured ESLint setup.

## Local Fool setup for the installed development app

The installed Android app now uses the isolated local API at `http://127.0.0.1:8794` through USB reverse forwarding. Its registry reported `{open:true}` before handing setup to the founder. Metro runs on host port 8084, forwarded from device port 8081. This is a local development registry using the existing central membership implementation, not independent Sefirah governance or a production network reset.

Local configuration, the development authentication environment, and persistent registry state live under ignored `apps/edge/.wrangler/sefirah-device-network/`. Preserve that directory for subsequent tests. The local server binds only to loopback and uses local Durable Object storage. No deployed registry was modified. The founder completes the existing hidden welcome card long press flow, keeping the generated recovery words and choosing passcodes privately on the phone. Completion and assignment of Sequence 0 have not been verified yet.

## Sources

- [TorClient onion APIs](https://docs.rs/arti-client/0.47.0/arti_client/struct.TorClient.html).
- [Arti onion service implementation](https://docs.rs/tor-hsservice/0.47.0/tor_hsservice/).
- [Expo local modules](https://docs.expo.dev/modules/get-started/).
- [Expo module API](https://docs.expo.dev/modules/module-api/).
- [Rustls provider initialization](https://docs.rs/rustls/0.23.45/rustls/crypto/struct.CryptoProvider.html).
