# Architecture

## Implementation checkpoint, 20 October 2026

Use the [current audit](status-audit-2026-10-20.md) for the service inventory and
security boundaries, and the [roadmap](roadmap.md) for remaining work. This
checkpoint supersedes older implementation status statements below, while
preserving their architectural intent and historical evidence.

Native Android and Swift MLS and Arti bridges now exist. The app has encrypted
native chat state, recipient sealed delivery, Tor attempt/fallback routing logic,
and actual text chat confirmed by the owner on 14 October. Signed encrypted member
profiles, central connection coordination, unread/activity indicators and push
integration also exist. Both updated phone apps were confirmed working on 16 October.
Independent primary route behavior and phone lifecycle edges still need evidence;
neither the synthetic Tor probes nor that confirmation proves the whole network.

Current admission, handle uniqueness, boards and connection coordination remain
central. The backend uses direct Worker routing and SQLite Durable Objects for
registry, mailbox and push. The installed test apps use a separate hosted test
Worker at `https://tero.pherus.org/_test`, preserving their existing accounts. The
public site has its own registry. There are no D1/R2 application bindings or
Hono/Drizzle implementation. Help content and service metadata remain readable
to the service; messages, journeys and directory profiles have distinct client
encryption boundaries. See [the threat model](threat-model.md).

Independent membership credentials, autonomous discovery, durable replication,
community node operation, organisation isolation, Bluetooth/LAN discovery and
nearby synchronization remain unbuilt. Voice transport is not selected. The old
disabled object experiment remains separate from the newer real chat mailbox.
Older claims below that all native transport or app chat integration is absent
are historical and must not be used as the current implementation inventory.

## Sefirah, the Q2Q network beneath Tero

The founder clarified this direction on 12 October 2026. Sefirah is Tero's queer to queer network. Tero is the application that uses it. The earlier central relay design below has been replaced as the intended direction.

This document describes the target, not a claim that the network is implemented. The current code still uses a central Cloudflare registry and server readable Help boards. Native app transports, private discovery, replication, network membership proofs, and distributed synchronization have not been built.

Development has now started on a separate, disabled encrypted fallback experiment. It provides signed encrypted objects and bounded SQLite storage, with a local sender/recipient demo that survives a Worker restart. A separate desktop spike successfully retrieved a synthetic encrypted object through a real Tor v3 onion service without Cloudflare. Neither path is connected to the app screens; fallback admission still uses central membership. The [build specification](specs/_root/0001-sefirah/index.md) records verification evidence and distinguishes these development slices from the network and governance work remaining.

Confirmed requirements:

1. Sefirah combines Tor, peer communication, torrent inspired distribution, and hybrid Durable Object transport.
2. Members' IP addresses must not be exposed to peers. A transport must not silently switch to a direct connection that violates this requirement.
3. Ordinary members may opt in to storing or forwarding other people's encrypted data. Community operated nodes support availability when ordinary devices are unavailable.
4. Durable Objects are transport and coordination helpers with limited statistical awareness. They are not the authoritative application database or the sole source of membership validity.
5. Tarot identities, the Fool, council, moderators, professionals, users, Spaces, resources, and the administration experience remain part of Tero.
6. The Fool and council may inspect the full member roster and invitation relationships. Private conversations remain outside those powers. Governance data must be encrypted for its authorised readers, rather than made readable to transport operators.
7. Sensitive data must be encrypted before it leaves an authorised endpoint. The founder delegated the cryptocurrency architecture recommendation: use private signed, verifiable records for membership and governance, rather than a blockchain. This recommendation does not yet specify authority, voting, conflict resolution, or revocation rules. The donation wallet remains a separate feature.
8. The network must resist dependence on one discoverable or blockable public endpoint. Precise failure and privacy guarantees must be established and tested; no claim of absolute invisibility or immunity to blocking is made.
9. Sefirah's own privacy preserving network is the default worldwide route. Cloudflare transport is an optional fallback, not the default ingress or a prerequisite for Sefirah to operate.
10. Nearby, AirDrop-like exchange is also a fallback. Devices must be able to exchange locally without internet and synchronize later. Weak internet must support queued, resumable delivery. An internet connection alone does not guarantee reachability: a usable route to participating nodes must exist. During a complete internet outage, nearby exchange cannot reach distant devices until a participating device later reconnects or carries the data onward.
11. Cloudflare must also bridge periods when participants are not online together, by holding encrypted fallback copies. The initial design must operate within free service allowances and must not require paid self-hosted infrastructure. This constrains supported capacity, rather than establishing unlimited free capacity. Future spending is possible but is not authorised or assumed by the initial architecture.
12. Private audio calls and live Spaces use Sefirah first and encrypted Cloudflare media transport as a fallback. Live audio and stored posts have different delivery and retention rules.
13. Sefirah must be usable by other queer organisations, not depend on Tero's app or administrators to keep operating. Long-term community continuity is the goal; perpetual operation without surviving nodes, storage, or operators is not a technical guarantee.

## Route selection

The following is the confirmed routing intent, not implemented behavior:

1. Try Sefirah's own privacy preserving routes to peers and community nodes. Tor connectivity and encrypted object replication belong to this primary network, rather than being upgrades to a Cloudflare session.
2. If a suitable primary route is unavailable, Cloudflare may carry encrypted traffic as a fallback. Losing Cloudflare must not prevent an otherwise reachable Sefirah network from operating.
3. Nearby exchange provides a local fallback when a recipient or carrying device is reachable nearby. Cloudflare and nearby exchange have different reach: this is not a requirement to contact Cloudflare before a useful local transfer can happen.

All routes must carry the same independently verifiable records and encrypted objects. Changing route must not change membership authority or grant a carrier access to private content. Devices need a persistent encrypted outbox, acknowledgements, duplicate suppression, resumable transfers, expiry rules, and later synchronization. A disabled development outbox now preserves immutable objects and per route storage receipts with encrypted restart recovery and lock cancellation. Real phone persistence, recipient acknowledgements, resumable transfers, and synchronization remain unverified or unbuilt. See [the device outbox specification](specs/_root/0001-sefirah/0003-device-outbox.md).

The no-peer-IP-exposure requirement applies to fallback routes too. AirDrop-like describes the nearby exchange experience, not permission to use direct Wi-Fi or LAN connections that expose addresses. The local transport and its discovery metadata must be assessed against that requirement before implementation. A nearby radio exchange also does not imply that physical proximity is hidden.

## Asynchronous availability and cost

Cloudflare fallback is both a delivery route and an encrypted store-and-forward service. For example:

1. Alice comes online while other participants and community replicas are unavailable. She creates and encrypts a post locally.
2. Alice uploads the encrypted object and the minimum retrieval metadata to the fallback. Only a durable storage acknowledgement permits the app to report that an off-device copy was saved. If fallback storage is unavailable, the post remains queued locally and must not be reported as remotely available.
3. Alice disconnects. Bob later connects, retrieves the authorised encrypted object, verifies it, and decrypts it locally. This does not require Alice to be online.
4. As participating devices and community nodes return, they synchronize missing objects through Sefirah. Their exchange does not require Cloudflare when a primary route is available.

Downloading once does not establish that all future readers received a post, or that another durable replica survives. Fallback copies cannot simply be deleted after the first download. Retention, replica acknowledgements, expiry, deletion records, and storage budgets need explicit rules, including what happens when every device holding an object goes offline. Cloudflare remains a fallback even when an offline-delivery requirement causes a backup write while primary peers are available; the trigger for that write must be based on required durability, not mandatory duplication of every network transfer.

Proposed cost controls: synchronize only missing objects, batch requests, resume chunks, avoid continuous polling, bound object sizes and retention, enforce organisation and account quotas, and prioritise scarce fallback capacity. Ordinary peer and community traffic should not be relayed through Cloudflare by default. At capacity, preserve local queues and report degraded fallback availability rather than silently dropping accepted data or automatically enabling paid services.

Founder clarification: recurring paid servers are not an acceptable baseline merely because they are self-hosted. Sefirah must first use participating devices, voluntary existing community capacity, and explicitly bounded free service allowances. Community nodes must not be assumed always available or free to their operators. Free-first operation must have an explicit capacity envelope; when it is exhausted, new fallback storage or calls may need to queue or be unavailable. Required retention and acknowledgements must not be silently weakened to fit a quota. Future paid capacity requires a separate decision.

Cloudflare's documented allowances must be checked when implementing and sizing this service. As checked on 12 October 2026, [Durable Objects Free limits](https://developers.cloudflare.com/durable-objects/platform/pricing/) include 100,000 requests/day, 13,000 GB-s/day, 5 million rows read/day, 100,000 rows written/day, and 5 GB total SQL storage. Exceeding a free limit causes the affected operations to fail. These are account allowances, not independent allowances for every organisation; Workers and any additional products also have their own constraints.

## Live media

Calls and Spaces require a separate live-media design alongside stored-object synchronization. Signalling, membership, and room permissions must be independently verifiable; media must be end-to-end encrypted before any relay receives it. Media relays do not receive conversation keys. Live audio is not retained as a fallback post or recorded by default.

Confirmed participant limits (founder, 12 October 2026): private audio calls are normally between two people and support at most four participants in a group call. Spaces permit at most six simultaneous speakers, including the host, with additional listeners. Both primary and fallback routes enforce the same limits. There is no product limit specified for listeners, but actual capacity remains bounded by infrastructure and bandwidth. The fallback media provider is not settled: the founder requested a comparison of options rather than confirming Cloudflare Realtime.

Paid self-hosted media relays are not selected and must not be required for initial operation. Investigate device-supported delivery and genuinely free service capacity without relaxing encryption or peer IP privacy. Anonymised or masked addressing must hide the underlying address through a real transport mechanism; hashing an IP, using an alias, or encrypting the audio does not hide the source IP of a direct internet connection. The founder's willingness to use masked IPs does not authorise exposing bare IPs to peers. The transport providing that masking, its performance, and its resource costs remain unresolved.

The primary media path must belong to Sefirah, with Cloudflare used only when an eligible primary media path is unavailable. A route being suitable for posts does not prove it has acceptable live-audio latency, throughput, or privacy. Tor-based media and any alternative relay path require measured validation against the no-peer-IP-exposure rule. The existing Cloudflare-only voice description below is an earlier proposal and is superseded by this primary/fallback requirement; no complete replacement media protocol is implemented yet.

Costs grow with delivered audio and listener fan-out. [Cloudflare Realtime pricing](https://developers.cloudflare.com/realtime/sfu/platform/pricing/) has its own allowances and billing, separate from Durable Objects. A free Workers deployment does not establish that fallback calls and Spaces will remain free at arbitrary scale. A measured capacity budget and explicit behavior when that budget is exhausted are required before enabling fallback media.

## Use beyond Tero

Sefirah is a reusable network layer; Tero is its first application. Other queer organisations must be able to run compatible nodes and applications and contribute availability. Sharing transport must not automatically share membership, administration, private content, or invitation graphs. Tero's Fool and council administer Tero, not every organisation using Sefirah.

The protocol needs versioned interoperability, organisation-scoped authorities and encryption, discovery without dependence on Tero's public domain, resource isolation, and a documented way to operate independent nodes. Cross-organisation membership and content sharing require explicit permissions. More operators can improve continuity, but availability still depends on reachable nodes and surviving encrypted copies. These capabilities are requirements, not shipped features.

## Application and governance

- **Expo** (React Native, expo-router) remains the existing app for iOS, Android, and web.
- **`tero.pherus.org`** remains a public front door, not the required address for all network operations.
- The council dashboard remains an application surface with explicit permissions. Its access to governance records does not grant conversation keys.
- The Fool or a council member appoints moderators directly, without a vote. Professional and moderator badges are visible to members. Fool and council role badges are visible only to the Fool and council. Permission verification must remain independent of badge presentation, and audience restrictions must apply to delivered data as well as the interface.
- Professional verification is a category-scoped credential added to an existing member account. Any member may apply and submit one-time verification evidence for authorised council review. Council can approve by vote; the Fool can approve directly and close the pending vote. A verified badge and category listing enable the relevant professional activity without granting governance powers. Evidence, credential issuance, concurrent decision handling, and renewal/revocation need implementation; see [professional verification](roles-and-sequences.md#verifying-professionals).
- A valid council revocation proposal immediately restricts the target to read access plus speaking/listening in council audio and commenting within council discussions. Other actions and comments are blocked while the case remains unresolved. The voting window is 24 hours: more revoke than retain votes means revocation wins, subject to the Fool's veto. Ties or no votes mean no revocation and case-specific restrictions are lifted at closure. Minimum participation, abstention handling, and remaining finalisation rules require specification. Enforcement requires verifiable governance state and an offline freshness policy, not only interface controls; see [pending-vote restrictions](roles-and-sequences.md#restrictions-during-a-council-revocation-vote).
- Every member has a unique Tero handle and a separate display name and tarot identity. For example: `@laniina`, `La niina`, `The Fool`. Handles are not derived from cards. The Fool card is never reassigned; council cards can return to rotation following authorised revocation. Signed records must distinguish account keys, handles, card assignment, revocation history, and current permissions. Concurrent offline handle claims and the ordinary-member versus reserved-card deck still require specification; see [roles-and-sequences.md](roles-and-sequences.md#member-identity-username-and-tarot-card).
- Referral-parent links persist for ordinary invitations; council appointments have separate governance provenance, with council members as independent referral roots. Moderators lead ordinary-member compromise cases: moderators and the immediate inviter receive the alert, the council is informed, and earlier references support escalation if the inviter is unavailable. The Fool and council may follow up but routine handling does not require their intervention. Council leads professional compromise cases. During the Fool's compromise, a council member temporarily holds Sequence 0 according to the Fool's preconfigured successor order, retaining their own card, handle, and referral tree. Restoration requires a 24-hour wait and at least three council approvals, with the first two in the successor order informed. Council revocation votes require a live council audio call and notification to all council members; the ballot threshold remains unresolved. Verification and partition-safe authority transitions require design; see [emergency succession](roles-and-sequences.md#emergency-sequence-0-succession).
- Membership, role decisions, and revocations need verifiable representations that clients and community nodes can check independently of a Cloudflare database response. The exact representation, conflict handling, and freshness rules remain to be designed.
- Losing a transport service must not erase identity, membership evidence, or the only copy of important application data. Replication, acknowledgement, deletion, and offline recovery rules remain to be designed.

## Transport and storage boundaries

| Part | Intended responsibility | Current implementation |
|---|---|---|
| Member device | Identity keys, encryption, authorised reads, local state, permission checking | Identity and vault exist; full local application storage and network verification do not |
| Peer communication and Tor | Private connectivity without exposing member IP addresses to peers | Desktop onion retrieval spike passed; Android Arti core passed bidirectional encrypted phone/desktop exchange; manually pinned signed contacts implemented; Expo/JNI pending, iOS and automatic discovery unbuilt |
| Torrent inspired distribution | Replication and retrieval of encrypted objects with verifiable integrity | Not implemented; use of a particular torrent protocol is not decided |
| Community nodes | Availability and forwarding under the same access and encryption rules | Not implemented |
| Durable Objects | Optional fallback for temporary encrypted delivery, coordination, and permitted transport statistics | Separate disabled encrypted fallback experiment exists; current app registry remains central and requires migration |
| Nearby exchange | Local fallback with encrypted exchange and later synchronization, subject to the same peer IP privacy requirement | Not implemented |
| Administration | Authorised roster, invite relationships, roles, verification and moderation workflows | Basic founder and council features exist; most workflows and encrypted governance storage do not |

Public peer discovery and public swarm announcements must not be assumed to satisfy Sefirah's privacy requirements. Encryption of content alone does not hide the participants or their activity. The actual discovery and transport choices require a separate build specification.

The existing OpenMLS decision (D39) remains the starting point for chat and group encryption. It is not a transport, discovery service, governance consensus system, or complete implementation of Sefirah.

The sections below describe application protections and services to retain in the target. References to server freezing and centrally served state must be reconciled with Sefirah's verifiable governance and distributed delivery design before those features are implemented.

## On the device

- **Passcode every time.** The app locks when it's closed, after 30 minutes in
  the background, or straight away with the Lock button. The passcode unlocks the encrypted vault and the
  keys.
- **Decoy passcode, entered on the same lock screen.** It opens only the
  most basic, harmless information. Nothing on the screen shows that a
  decoy was used, and nobody can tell a hidden vault exists.
- **Duress alert.** Entering the decoy passcode also silently sends a
  panic alert (see below).
- **Panic wipe** and no notification previews.

### Duress alert

When the decoy passcode is entered:

1. A silent alert is routed according to role. For an ordinary member, moderators
   and the person who invited them receive it, and the council is informed:
   "this person has been forced to open Tero". Moderators handle the case;
   the Fool and council can follow up without needing to intervene. Professional
   cases are handled by the council. Council and Fool cases follow the
   [emergency governance rules](roles-and-sequences.md#emergency-sequence-0-succession).
2. Nothing on the device shows the alert was sent. It leaves no trace in
   sent messages.
3. The account's sensitive access is frozen on the server, and other
   linked devices are signed out.
4. People who chat with the person are warned that their conversations
   may be exposed, so they can protect themselves.

### Recovering after a duress alert or false alarm

The person reaches out to whoever brought them into Tero, who sends a
**one-time recovery passcode**:

| Brought in by | Who sends the recovery passcode |
|---|---|
| A member (Tero card) | The member who invited them |
| A moderator | The moderators |
| The council | The council |
| The Fool | The Fool |

Recovery has three steps:

1. **Pick the cards.** The person picks two cards from a full shuffled
   tarot deck (78 cards, upright or reversed):
   - **Their own card**, chosen secretly when they joined.
   - **The bond card**, chosen secretly together with the person who
     brought them in, at the moment the Tero card invite was approved.
     Only the two of them know it.

   The deck is shuffled differently every time, so someone watching can't
   learn the cards from where the person taps. After 3 wrong attempts,
   recovery locks and the person who brought them in is told.
2. **Confirm it's them.** The sender confirms, outside the app, that it's
   really them and that they're safe (in person, or with a check agreed
   beforehand). Then they send the one-time recovery passcode.
3. **Wait 24 hours.** Nothing comes back until 24 hours have passed. The
   alert recipients can cancel during that time.

If the person who brought them in is gone or unreachable, the country's
council handles it.

The cards are something the person knows, so an attacker can force them
to reveal them. That's why steps 2 and 3 always stay.

### Where these protections apply

The strict protections (duress alert, card recovery, 24-hour wait) are
**on by default only where the risk is high**: countries with laws or
violence against queer people, and specific places within otherwise safer
countries (for example some US states). The country pack sets this.

- Each person can turn the strict protections on anywhere.
- In a high-risk place, they can't be turned off.
- The level follows the country the person chooses in the app, not GPS,
  so Tero doesn't track location. Travellers are reminded to switch when
  they move.

## Ephemeral chats

- Private chats **clear automatically** by default.
- A chat is kept only if **both people agree**, and either can withdraw.
- **Screenshot alerts** like Snapchat: the other person is told when a
  screenshot is taken. This warns but can't stop it; a second phone camera
  always works.
- Platform limits: iOS can detect screenshots but not block them. Android
  14 and later can detect them, and Android can block them on chosen screens.

Honest limit: if a phone has spyware or someone is forced to unlock it,
most protections stop working. We reduce risk; we don't promise zero.

## Voice: Spaces and calls

| Use | Who can talk | Who listens |
|---|---|---|
| **Spaces** for communities, groups, skills, learning, Discord-style hangouts | Up to **6 speakers** (host included) | Everyone else in the room |
| **Voice with a professional** (consultations, enquiries) | The two people | Nobody else |
| **Private audio call** | Normally 2 people; up to **4 participants** for a group call | Call participants only |

- **End-to-end encrypted.** Audio is encrypted on the speaker's phone
  (the existing proposal is SFrame, with group keys from MLS) before it reaches a
  media relay, which forwards it without being able to listen. Sefirah is the primary
  route; the fallback media implementation is still being evaluated. Keys change
  whenever someone joins or leaves.
- **Voice disguise.** Speakers can change their voice. This happens on the
  phone, before encryption, so the real voice never leaves the device.
- **Not recorded** by default.
- **Live subtitles.** Each speaker's phone turns their speech into text
  and sends it encrypted alongside the audio. Each listener's phone
  translates the text into a language they understand. Everything happens
  on phones, so it stays end-to-end encrypted. This uses the speech and
  translation tools built into iOS and Android, so the app doesn't grow.
  Support for some languages (for example Swahili) differs by phone and
  may need a one-time language download.

### Signalling danger in a Space

Two ways for a speaker to say "I'm being forced to be here" without the
person forcing them noticing:

1. **The danger reaction.** It looks exactly like an ordinary reaction
   (for example the raised hand), but is sent with a different secret
   gesture (for example a long press instead of a tap). On the speaker's
   own screen it looks the same as normal.
2. **A safe word.** Each person sets their own safe word (any word they
   like, for example a word from the novel). Their own phone listens for
   it while they speak in a Space. The safe word never leaves the phone
   and is never shown in subtitles.

What happens next:

- The speaker's icon changes colour, and a message appears for **trusted
  people in the room only** (moderators, and members the person has
  marked as trusted): "this person may be being forced to be here".
  Ordinary listeners don't see it, because the attacker might also be in
  the room. The speaker never sees it.
- A duress alert goes out (as above).
- After a short while, the speaker is dropped and their screen shows
  "this Space has ended".
- Their whole app then **slowly switches to basic mode** over the next
  minutes, without any notice, as if the decoy passcode had been used.

The danger reaction and safe word are both described to Apple's reviewers
as safety features.
- Honest limits: everyone in the room can hear, so encryption protects
  against the server, not against a listener in the room. Voice changers
  hide a voice from people, but they aren't perfect against forensic
  analysis.

## Identity: your keys are your account

**No PassID. No usernames, emails, phone numbers or passwords.** Like a
crypto wallet, each person's account *is* a set of keys they hold.

### How it works

1. **On first launch**, the phone creates a secret **seed** (shown once as
   a recovery phrase of 12 words).
2. From that one seed, the app derives **separate keys** that can't be
   linked to each other in public:

   | Key | Used for |
   |---|---|
   | Identity key | Your Tero address (what others see and verify) |
   | Messaging keys | End-to-end encryption |
   | Wallet keys | Celo (USDT and USDC), with a new address per fundraiser |
   | Per-app keys | Signing in to other apps, a different key for each |

3. **Signing in** means proving you hold the identity key: Tero sends a
   challenge, and the phone signs it. Nothing secret is ever sent.
4. **Keys are stored in the phone's secure hardware** (Secure Enclave on
   iOS, Keystore on Android), locked behind the app passcode.
5. **More devices** are added by scanning a QR code from a device you
   already have, like Signal or WhatsApp.

### Why the keys are kept separate

If your Tero address were also your wallet address, anyone could look up
every donation you ever made on the public blockchain and link it to your
Tero identity. The same applies to using one key in many apps: it would
let those apps match you up. Separate keys from one seed give you one
backup, without one public trail.

### "Use it anywhere else"

The identity follows a published standard (a decentralised identifier such
as `did:key`), so other apps, including future Pherus apps, can let people
sign in with it. Each app gets its own key by default. A person can choose
to prove two keys are theirs when they want to.

### Recovery

- **Recovery phrase**: the 12 words restore everything.
- **Social recovery**: the seed is also split among people you trust (for
  example any 3 of 5), so losing both the phone and the phrase isn't the
  end.
- **Duress recovery**: see above.

### What we give up without PassID

| Lost | Replacement |
|---|---|
| Age check (over 18 / 21) | The inviter confirms the person is of legal age for their country when approving the Tero card, and the person declares it. Inviters are accountable through trust. |
| A central account to disable | The council can ban an identity key on Tero's servers. The key still exists, but Tero won't serve it. |

PassID can still be added later as an optional extra, but nothing depends on it.

## Languages

English, Swahili, Chinese (zh) and French from day one. No text written
directly into code; everything goes through translation files.
