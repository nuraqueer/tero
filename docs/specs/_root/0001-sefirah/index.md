# 0001. Sefirah network migration

**Date**: 2026-10-12
**Status**: In Progress

## Summary

Sefirah is the reusable private network beneath Tero. Its own routes are primary, while Cloudflare and nearby exchange provide fallbacks. Build alongside the existing application so working features remain usable while new delivery and governance are proved.

## Structure

- [0001-delivery.md](0001-delivery.md): first development slice, encrypted objects and bounded fallback storage.
- [0002-governance.md](0002-governance.md): confirmed identity, authority, badge, and incident rules; remaining protocol decisions.
- [0003-device-outbox.md](0003-device-outbox.md): encrypted device queue, restart recovery, and session lifetime.
- [0004-fallback-client.md](0004-fallback-client.md): explicit authenticated HTTP fallback and bounded response handling.
- [0005-native-tor.md](0005-native-tor.md): embedded Android Tor, signed private contacts, and device verification evidence.
- [0006-member-discovery.md](0006-member-discovery.md): encrypted member profiles, permanent handle claims and transitional contact requests.
- [0007-private-message-engine.md](0007-private-message-engine.md): official OpenMLS two-person engine and Android bridge; real chat integration remains pending.
- [0008-message-state.md](0008-message-state.md): encrypted native state, atomic queues and restart verification.
- [0009-messaging-ui.md](0009-messaging-ui.md): accepted-contact chat access, compact messaging UI and unavailable delivery states.
- [rationale.md](rationale.md): migration reasoning and operational constraints.

## Requirements

### Founder additions, 2026-10-13

These are confirmed product requirements, not claims of implementation. They extend the migration scope. Detailed protocols, data contracts, failure handling, and verification remain necessary before each feature ships.

Subsequent confirmations on the same day: account handles are permanent and display names editable. Ordinary private messages expire 24 hours after both participants read them; messages still unread after seven days are deleted (founder’s corrected rule). Group read rules still need specification. Only the first completed Beacon between the same pair within 30 days contributes promotion stars. The iPhone tab bar must sit low near the bottom edge, without the large blank gap caused by adding the entire home indicator inset beneath the capsule.

Further navigation corrections: preserve native iOS Liquid Glass and SF Symbols, use one capsule for the first four tabs, and a separate round You control. Android needs shorter controls and a slightly larger bottom gap. Current implementation uses native `GlassView` on supported iPhones, backdrop blur on Android, shared spring motion, and platform specific dimensions. This does not establish native iPhone Sefirah support.

Two device test arrangement: Android retains the existing local Fool identity; iPhone will create a separate council identity by scanning a council invitation in Tero. Both must use the same registry. A test only device reset removes local vault keys and biometric unlock, closes transports and invalidates pending sign-ins, without deleting membership or changing roles. The user must save recovery words and confirm the device reset themselves. The shared local API retains the existing ignored SQLite state and auth secret. ChromeOS Wi-Fi forwarding is a test environment requirement, not intended member onboarding.

- Hino is Pherus's own interface language, inspired by Apple's materials, care, and smoothness. Share icon shapes, proportions, motion, and global style tokens across iOS and Android, with appropriate platform differences rather than mechanically identical rendering. Slim floating tabs, slightly wider edge spacing, transparent glass over scrolling content, accessible touch targets, and reduced motion support are required.
- Normal membership must be install, account setup, and entry into Tero. Sefirah operates internally without manual peer packets, separate Tor setup, or a diagnostic build as a normal member requirement. Expo Go dashboard previews remain a simple scan flow for compatible UI testing. Native Sefirah on iOS still requires an app binding and app binary; a JavaScript update cannot provide it.
- Circles shows the actual number of network members in a compact badge, with counts such as 100, 300, 1k, 24k, and 4.5m. This is membership size, not a fabricated live peer count. Presence is a separate concept.
- You allows editing a unique account handle and a display name, distinct from the tarot card. Circles includes Network (member discovery and search), Contacts (people directly connected), and Following (professionals followed), then circles or shapes, groups, channels, and recent chats. Members may discover other members and request a connection. Invitation relationships and private conversations are not thereby made public. Disclosure and encryption of searchable profiles require a specific protocol, not plaintext fields casually added to the existing central registry.
- Help removes Map and its duplicate Show my Tero card entry. Crisis support and mutual aid remain prominent. The card stays in You. Someone to talk to becomes Help Beacon when the actual service is implemented.
- Beacon requesters activate a request. Only helpers who explicitly mark themselves available receive it. Help shows a red pulsing indicator while a request is available, with a static alternative for reduced motion. Matching presents both cards and requires both people to accept before opening a private Messages conversation. Concurrent claims must not match one request to several helpers.
- Beacon conversations support text and audio calls. Ending the Beacon disconnects both sides and removes its chat from both apps. A new conversation cannot inherit the previous conversation's content. Optional ratings and a short feedback questionnaire follow. Remote deletion cannot erase a copy a recipient has already captured; the product must describe enforceable retention accurately.
- Beacon ratings contribute to trust progression: five stars can move an ordinary member from Sequence 9 to 8; smaller ratings accumulate toward promotion. Progress becomes harder at higher trust, with ordinary members capped at Sequence 2. The per level thresholds, repeat pair limits, rating authenticity, abuse controls, and negative rating effects remain to be specified. Do not convert raw client ratings directly into permissions.
- Role and Sequence are separate. Moderators are Sequence 2. Professionals receive a two level trust improvement on verification, capped at Sequence 2 (9 becomes 7, 4 becomes 2). Neither role automatically grants council or Fool authority, nor progression into Sequence 1 or 0. Council admission requires an authorised council vote or Fool appointment, regardless of prior Sequence. Professionals can be demoted or removed. Profession specific cards and a controlled card switch are requested; council seat uniqueness and the permanent Fool card must remain intact.
- Scanning a member card verifies membership and trust. Nearby sharing can use Bluetooth, a shared local network, and appropriate proximity mechanisms. Both people must explicitly enable nearby sharing. Automatic contacts require both to be Sequence 7 or better in trust (7 through 0); Sequence 8 and 9 use manual acceptance. Broadcasts may match multiple nearby people. Card flip, Verify, and a returned wave confirm the person matched. Sensitive countries such as Uganda restrict the feature to Bluetooth range; safer country policies may enable wider proximity and a brief call style alert or Tero sound. Exact proximity thresholds, country policy authority, radio permission behavior, and relay resistance remain undecided. Bluetooth does not prove physical identity or an exact distance.
- Marketplace is country selectable with Global as the default. Members advertise items they own and no longer need. Buyers message the seller with a listing reference. Moderators restrict allowed listings. Listings last one week, then expire. No platform payment flow is requested; the stated rule is no payment before delivery. Permitted item policy, enforcement and moderation transitions still need definition.
- Gathering incorporates Help posts. It mixes new posts, member interest signals, votes, and older content when appropriate, without making country the main ranking filter. Show an honest exhausted feed when there is nothing else. Interest learning should remain private; a local recommendation model is preferred for evaluation. Ranking weights and vote abuse controls are not yet specified.
- Messages follows the prior Snapchat style ephemeral default and iMessage inspired presentation. It needs live and typing indicators, emoji, images (no video), and voice notes of at most one minute. Known links are allowed; unknown links must be rejected or warned about. Professional exchanges additionally need PDFs, files, and structured questions or forms (for example legal name changes, reports, and assistance). Exact expiry, read behavior, offline delivery, file limits, known link policy, and abuse/report retention remain to be specified before implementation.
- Professionals such as lawyers have verified country qualifications; a generic lawyer badge must not imply authority in every jurisdiction. Each country has at least two moderators, primarily responsible for its information while retaining broader moderation capability. Moderators, council, and Fool can update country risks, legal notices, security levels, and feature restrictions. Seed country information needs sourced, dated legal review; do not invent current laws or treat country labels as a guarantee of safety.
- Notifications should use free services where possible. FCM and Apple's notification path need evaluation for native apps, with generic wake signals rather than private content in third party push payloads. Provider availability must not be treated as Sefirah message delivery or a guarantee that background apps stay online.
- Screenshot protection defaults on for every role, with a development exception. Allowing screenshots in selected areas requires unanimous approval of every eligible council member; abstention prevents the change and the Fool has no veto. Eligibility, voting window, policy signing and device enforcement need specification. OS screenshot and recording restrictions have platform limitations and cannot prevent an external camera.

Build order: finish shared Hino navigation and Help cleanup, then specify and build searchable profiles and membership verification, connections and messaging, Beacon lifecycle, trust transitions, country policy and moderation, marketplace and feed ranking, nearby exchange, and native push. Do not claim the network or these features complete from UI work alone.

- **AC-1**: A sender encrypts and signs an object before sending it to any carrier. An authorised recipient verifies its integrity and author after decryption.
- **AC-2**: A development fallback can retain an immutable object across sender disconnection and storage reconstruction. Fetching it does not consume it or remove it for later readers.
- **AC-3**: Duplicate uploads return the original receipt. Invalid, expired, oversized, or over capacity uploads are rejected without evicting accepted live data.
- **AC-4**: The development service is disabled by default, uses existing admission only as an explicit transitional gate, and does not change existing app behavior.
- **AC-5**: Sefirah eventually synchronizes through validated private primary routes without Cloudflare, with durable local queues, nearby fallback, and resumable delivery. Carrier adapters or simulations alone do not satisfy this criterion.
- **AC-6**: Governance eventually implements the confirmed rules in the governance child, with verifiable transitions and explicit partition behavior.
- **AC-7**: Audio eventually supports private calls of up to four participants and Spaces of six speakers plus listeners, within measured free capacity and without exposing bare member IPs to peers.
- **AC-8**: Other organisations can eventually operate compatible nodes without inheriting Tero's administrators or private records.

## Decision

Build in thin, testable slices, using existing TypeScript, SQLite, Ed25519, XChaCha20 Poly1305, and SHA256 components. The first slice is a disabled development fallback API, not a claimed primary network or migration of live content. No new crypto primitive, paid server, or automatic service upgrade is introduced.

## Shared boundaries

Object identity is derived from immutable encrypted bytes and expiry. Encryption keys never go to the fallback. Content signatures remain inside encryption; the transport does not need to see the content author. This does not hide transport metadata, authenticated upload identity, traffic timing, or IPs from the service operator.

A receipt establishes storage at one carrier until the stated expiry, not receipt by a recipient or replicated durability. Retention budgets for real member content remain undecided. Test limits are engineering limits for the disabled experiment, not product retention promises.

Membership is still central in the current implementation. Do not migrate Help boards, identities, or recovery until independent credentials and permission verification exist. Legacy documentation is historical where these confirmed rules supersede it.

## Build plan

1. Implement the encrypted object format and verification, AC-1.
2. Implement bounded SQLite fallback storage and gated Worker endpoints, AC-2, AC-3, AC-4.
3. Prove sequential sender and recipient exchange using real encryption and SQLite, including retries and restart, AC-1 through AC-4.
4. Validate native Tor connectivity between real devices before choosing a production adapter. Add encrypted local persistence, acknowledgements, route selection, discovery and nearby exchange, AC-5.
5. Specify authority transitions, credentials, governance conflict resolution, and application migrations, then implement the governance child, AC-6.
6. Measure private audio transport and fallback capacity before selecting the media implementation, AC-7.
7. Define organisation isolation and compatibility tests, AC-8.

## Consequences

The first slice is useful for development and failure testing but not available in the app. It cannot establish anonymity, production availability, or a free cost envelope by itself. Object keys and locators must initially be provided through the test harness, not an invented production key distribution scheme.

## Implementation evidence

The encrypted object helper, separate fallback Durable Object, bounded HTTP API, and localhost demonstration are implemented. The object crypto and fallback tests pass. A local Wrangler session accepted the sender's post and retry; after stopping and restarting Wrangler against the same disk state, a separate recipient process retrieved and verified the post twice. Local SQLite inspection confirmed the object columns are only `id`, `box`, `expires_at`, and `stored_at`.

This establishes development fallback persistence, not independent native connectivity, replica synchronization, real member key distribution, or governance enforcement. The flag remains absent from the checked-in deployment configuration. No production deployment has been performed.

The separate desktop Tor spike also passed: two isolated Tor 0.4.9.11 instances connected to the public Tor network, and a synthetic signed encrypted object was fetched through a temporary v3 onion service without Cloudflare. The initial request took 124,802 ms including retries and connection setup. This is a single sample on one host, not steady-state latency or evidence that calls will work well. Native phone transport, peer discovery, and multi-device synchronization remain unbuilt. The device outbox foundation was added on 2026-10-13 as described below. The spike removes its temporary Tor processes and service keys on completion.

Verification at the first slice: 157 tests across 20 files pass, all six workspaces pass TypeScript, and both development scripts pass a separate Node TypeScript check. Formatting passes for new implementation files. The repository-wide formatting check still reports pre-existing issues in `apps/app/app.json` and generated `apps/app/expo-env.d.ts`. No phone, browser interaction, or production deployment verification is claimed.

On 2026-10-13 the encrypted device outbox foundation was added, with native FileSystem and web localStorage adapters. It preserves immutable objects and per route storage receipts, recovers an earlier authenticated snapshot after a torn write, rejects capacity overflow, and cancels sends on close. Full sessions own its lifetime, including lock and decoy entry. `EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL` must explicitly enable it; existing screens do not use it. Eleven new file backed tests pass, bringing the suite to 168 tests across 21 files. App TypeScript and changed code formatting pass. Expo exports succeeded for iOS, Android, and web with the development flag both absent and enabled. This does not establish phone runtime persistence or real transport integration. Expo lint was attempted but could not run because ESLint is not configured or installed and Bun is unavailable in this environment.

The explicit fallback client was then connected to the development API interface. It rejects redirects, limits streamed responses, validates receipt and object identity, supports cancellation and a request deadline, and has no automatic route selection or retry. The demonstration reopened an encrypted sender queue, uploaded through this client, then verified retrieval twice in a separate recipient process after stopping and restarting the real local Wrangler Worker with the same SQLite state. Eight new HTTP tests bring the suite to 176 tests across 22 files. App and demonstration script TypeScript pass; development enabled iOS, Android, and web exports succeed. This is local desktop execution, not phone runtime validation or primary Sefirah delivery. No production deployment was performed.

The Android arm64 native Arti core and signed private contact foundation were then implemented. The physical TECNO core harness bootstrapped Tor and exchanged a signed encrypted object in both directions with a separate desktop Tor peer, without Cloudflare. The suite now passes 190 tests across 25 files, app TypeScript and changed code formatting pass, and the ordinary iOS JavaScript export passes. The Android debug APK also built, was installed on the physical TECNO, and opened to the welcome screen. Native Tor invocation through the Expo/JNI screen and phone lock lifecycle verification remain pending. See [the native child](0005-native-tor.md) for exact boundaries; iOS binding, automatic discovery, replication, nearby exchange, and audio remain unbuilt.

## Follow-up

Navigation and local membership test evidence on 2026-10-13: split Hino navigation is visible on the physical Android, with a real member count of one. The iPhone preview uses native Liquid Glass on supported iOS versions and SF Symbols; actual iPhone rendering and council acceptance remain to be verified by the user. A new authenticated membership size endpoint returns only `members` and `checkedAt`, with admission and privacy tests. Device reset has storage removal, idempotence and failure tests, and no membership deletion endpoint. The full suite passes 209 tests in 27 files; all six workspaces pass TypeScript. Targeted lint passes for new navigation and reset code. Full app lint now runs but reports 13 existing errors elsewhere. The verified shared API is reachable through the Android's Wi-Fi address and USB reverse forwarding. This work does not satisfy independent membership, automatic primary routing, iOS native Tor, encrypted chat, or Beacon delivery.

- [ ] Agree real content retention and fallback exhaustion behavior.
- [ ] Validate native transport, peer IP hiding, and weak connection performance.
- [ ] Resolve the governance questions recorded in the child before implementing authority changes.
- [ ] Verify device persistence on real phones and define recipient key distribution before adding application callers.

## Rationale

Reasoning and alternatives: [rationale.md](rationale.md).

## Migration plan

**Strategy**: incremental, with the new service disabled by default.

Add a separate SQLite Durable Object namespace. Preserve the registry and current endpoints until independent delivery and governance are validated. Do not copy existing readable board content into a supposedly encrypted store at the server. Devices must perform encryption during the future migration.

**Rollback**: leave the new service disabled. Existing application traffic does not use it. If test data has been accepted, disabling prevents delivery; it does not erase that data or justify claiming guaranteed availability.
