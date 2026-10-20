# Tero project audit, 20 October 2026

## Assessment and review scope

Tero has a working early product, beyond designs and isolated experiments. Its
strongest implemented areas are identity, invitations, resource boards, private
planning, member discovery, and native encrypted text messaging. The owner has
confirmed real conversation between the test phones. The complete community,
safety, governance, and independent Sefirah network vision remains ahead.

This is a source and documentation review, not an independent security audit,
penetration test, or certification of safety. Gaps below are priorities for future
slices, not a claim that an early project should already have completed every
planned service. No application code was changed.

The scope is the current working tree on `main`, based on `ad52b7c`, including the
existing uncommitted hosted testing work. Sources include continuation and CLAUDE
history, decisions D1 through D69, specifications, manifests, Worker routes,
registry/board storage, discovery, native messaging, vault/session/biometric code,
journey saving, and representative screens. This was not a line by line review of
every file, a dependency vulnerability audit, or a test of every interaction.

## Evidence and current operation

| Evidence category  | What it establishes                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Implemented        | Source contains the behavior. This alone does not prove complete device operation.       |
| Owner confirmed    | An actual phone observation recorded in the handoff, limited to what was stated.         |
| Previously checked | Earlier tests, builds, deployments or probes recorded in the handoff, not repeated here. |
| Experimental       | A bounded development slice or diagnostic, not a complete product service.               |
| Planned            | A requirement or screen exists, but its service is absent or incomplete.                 |

The owner confirmed real chat on 14 October 2026 and Android notification display.
On 16 October the owner confirmed both updated apps work after the preserving
Android installation and iPhone TestFlight build 19. The hosted service preserves
the two existing test accounts and no longer requires laptop or LAN hosting.

Specific evidence remains outstanding for separate network messaging with the
laptop off, iPhone alerts, notification tap routing/sound, and receipt, expiry,
restart and background edges. These should not be inferred from “both work”.

Read only HTTP checks on 20 October returned 200 from `/api/health` and
`/_test/api/health`, and 401 from anonymous `/_test/api/discovery/members`.
This proves reachability and rejection of that anonymous request, not complete
authorization coverage or actual delivery. No credential or member data was read.

The 16 October handoff records 21 focused tests in four files, app/edge/transfer
type checks, scoped lint/formatting, a hosted bundle dry run, and matching transfer
table proofs. Earlier checkpoints record larger suites and native Rust checks.
These are historical results, not a current whole repository pass. This review
uses scoped documentation checks, with no full suites, native builds or device probes.

## Goal and product model

Tero aims to make queer community knowledge, resources, relationships, and
practical support easier to find, especially where disclosure can be dangerous.
The intended service spans care, work and money, safety and law, and health and
growth. Calm design and pseudonymous membership reduce unnecessary disclosure.
Invitations control admission; they do not prove every member is trustworthy or
every recommendation is safe.

Tero is the application and community. Sefirah is the intended reusable network
for Tero and other queer organisations. It aims for private delivery and continuity
without requiring one domain or Cloudflare when eligible nodes remain reachable.
The current hosted product does not yet satisfy that independence goal.

## Feature inventory: purpose, importance and limits

| Service               | What exists                                                                                                                                        | Why it matters                                                              | Remaining boundary                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Foundations           | Six Bun workspaces, TypeScript contracts, tests, CI, design tokens, four dictionaries                                                              | Shared contracts and checks support consistent development                  | Checks do not prove usable or secure phone workflows                                                 |
| Identity              | BIP39 recovery words, HKDF purpose separation, Ed25519 identity, signed sign in                                                                    | Avoids mandatory email/phone registration and enables phrase restoration    | Social recovery and stolen identity replacement remain                                               |
| Vault and session     | Two encrypted slots, real/decoy codes, retry delays, manual lock, 30 minute away lock, cancellation on lock                                        | Protects local access and separates basic from personal views               | No decoy alert; brief backgrounding does not immediately lock                                        |
| Biometrics            | Optional Face ID/fingerprint path and device storage                                                                                               | Makes ordinary phone unlocking faster                                       | App level biometric gating and coercion risks need explicit treatment                                |
| Invitations and roles | Create, share/scan, claim, compare code, approve, expire/destroy; founder/council/member roles                                                     | Controls admission and initial leadership permissions                       | Referral tree, moderator authority, voting and succession remain                                     |
| Directories           | Seven categories: mental health, safe spaces, legal, travel, providers, affirming care, general health; submission, filtering, vouches and removal | Makes practical local knowledge reusable                                    | Recommendations are not professional verification or partner approval                                |
| Mutual aid            | Requests/offers, author accessible replies, closing/removal, 30 day expiry rule                                                                    | Connects needs with offers of practical help                                | Server readable replies; no payments or outcome verification                                         |
| Jobs                  | Openings, remote/location filters, application details, removal, 60 day expiry rule                                                                | Supports livelihood and shared opportunities                                | No employer verification, placement guarantee or hiring service                                      |
| Stories               | Topics, content notes, month display, thanks, removal                                                                                              | Shares experience with fewer obvious identifiers                            | Text can still identify people; no default expiry or complete reporting                              |
| Skills/resources      | Teach/learn offers, links, author accessible replies                                                                                               | Makes community expertise useful                                            | No scheduling, accreditation or complete abuse workflow                                              |
| Journeys              | Templates/custom plans, checklists, device encryption, versioned server box                                                                        | Organises private personal plans                                            | Not clinical/legal coordination, booking or a durable offline editor                                 |
| Help interface        | Compact cards, search, real counts, creation sheet, Your posts                                                                                     | Gives practical services one usable entry point                             | Some destinations remain previews                                                                    |
| Gathering             | Real Help posts, filters, incremental reveal, links and honest empty/error states                                                                  | Helps members discover needs and resources                                  | No general publishing, events, polls, Circle feed or private ranking model                           |
| Discovery             | Signed encrypted profiles, directory key grants, permanent unique handles, editable names, local search                                            | Lets admitted people find one another without a plaintext server name index | Admitted members can read directory profiles; metadata and key rotation limits remain                |
| Contacts              | Request, accept, decline, cancel, remove                                                                                                           | Requires consent before service mediated chat                               | Removal is not a permanent block; professional following is unavailable                              |
| Private text chat     | Two person OpenMLS, Android/Swift bridges, encrypted SQLite snapshots, handshake, durable retries, text composer                                   | Turns finding help into a private conversation                              | No group changes, attachments, calls or full epoch healing                                           |
| Message state         | Authenticated peer delivery/read controls, seven days unread, shortening to 24 hours after both read times                                         | Separates carrier storage from real peer acknowledgment and limits history  | Physical edge evidence remains; expiry cleanup runs on native operations                             |
| Chat activity         | Unread counts, recent sorting, in app alerts, signed short lived Active now                                                                        | Makes conversations easier to notice                                        | Not exact last seen or continuous background reception                                               |
| Push                  | Registrations, wake queue, retries, diagnostics, encrypted tap pointer                                                                             | Alerts a recipient to reopen the app                                        | Sender names are provider visible by choice; iPhone runtime evidence remains                         |
| Tor and carrier       | Arti bindings, signed private contacts, encrypted descriptors/journal, primary attempt and fallback logic                                          | Provides building blocks for private routes and resilience                  | Controlled probes do not prove autonomous discovery, independent admission or full network operation |
| Hosted test service   | Separate Worker/namespaces, encrypted transfer, digest/table proofs and activation gate                                                            | Preserves accounts while removing laptop hosting dependency                 | Still centrally coordinated; old local data cannot silently replace hosted writes                    |
| Website/guides        | Public home, six guide listings with two populated, language selection                                                                             | Provides some resources without requiring membership                        | Content completion, translation and specialist review remain                                         |
| Administration        | Founder/council counts, invitations, role information                                                                                              | Supports initial operation                                                  | Not a full moderation or voting system                                                               |
| Design assets         | Shared navigation/type, editable icon sources, initial tarot designs                                                                               | Makes the app coherent and assets reproducible                              | Historic mockups are not evidence that depicted services work                                        |

Board expiry uses request driven cleanup. A quiet service may retain expired rows
until another relevant operation. Chat mailboxes separately use expiry alarms.
Neither establishes forensic erasure or deletion of a recipient's screenshots.

## Planned services and unfinished surfaces

Circles group conversations and topics; Spaces and private calls; images, voice
notes, typing indicators, professional PDFs/files/forms; voice disguise and
subtitles; anonymous listening; general posts, events, polls and fundraisers;
marketplace; professional verification and following; partner credentials and real
changing word checks; Beacon/trust progression; reporting, blocking, banning and
moderation casework; country policy packs; referral governance, council voting,
revocation and succession; duress/social recovery; nearby exchange; independent
membership/discovery, replication, organisation isolation and community nodes.

Crisis and map screens are previews, not an emergency response service or a
populated safety map. Wallet and stablecoin donation flows are absent. An encrypted
planner is not completion of HRT, travel, surgery or legal coordination. A directory
listing does not establish professional qualifications in a particular country.

## Architecture and dependency review

Expo SDK 57 and React Native serve phones, public web and restricted web console.
Rust OpenMLS and Arti modules have native Android and Swift bridges. Workers use
direct routing and SQLite Durable Objects for registry/boards, mailboxes and push.
There is no current Hono/Drizzle migration, D1/R2 application storage, wallet package,
or implemented production media service.

Cloudflare currently supplies admission, handle uniqueness, connections and
fallback storage. Expo carries push requests to FCM/APNs; EAS supports packaging
and distribution. Device operating systems control storage, background execution
and notification display. Open source availability alone does not make these
runtime dependencies replaceable.

## Security review findings

The posture is **promising foundations with incomplete protections and operational
evidence**, without a recorded independent audit. A numerical security score would
imply precision this review cannot support. Priorities below concern expanding
reliance, rather than blocking unrelated documentation. No exploit was attempted.

| Priority | Source observation                                                                                                                                                      | Consequence and next action                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Help bodies/replies and membership/connection metadata are service readable (`apps/edge/src/aid.ts:20`, `registry.ts:45`, `discovery.ts:19`).                           | Backend compromise/disclosure has a larger impact than the old ciphertext only promise. Correct claims; specify data migration and reader permissions.                       |
| High     | Decoy only changes local session (`apps/app/src/lib/session.tsx:360`). Invite approval deletes the card without retaining the parent (`apps/edge/src/registry.ts:342`). | No automatic help is summoned and the intended escalation tree is missing. Build referral records and incident delivery together.                                            |
| High     | Shared directory key rotation is deferred (`specs/_root/0001-sefirah/0006-member-discovery.md:29`); full membership/key revocation is absent.                           | Revoking API access cannot recall learned profiles or keys. Define rotation, fresh credentials and compromised account recovery.                                             |
| High     | Biometric storage omits `requireAuthentication`; a separate app check precedes reading the seed (`apps/app/src/lib/biometric.ts:17`, `:98`, `:128`).                    | App code access could bypass the UI gate. Assess OS enforced access and enrollment changes on both platforms. This is not evidence of a remote bypass.                       |
| High     | MLS epoch update/healing is outside the current scope; receive accepts application content (`apps/app/modules/sefirah-mls/native/src/lib.rs:459`).                      | MLS use alone does not establish recovery after endpoint compromise. Specify periodic updates, resynchronization and stale snapshot behavior.                                |
| Medium   | Journey save removes the pending value before upload and clears it on failure; conflicts reload (`apps/app/src/components/Journeys.tsx:80`).                            | Visible edits can disappear after failure/reload. Preserve encrypted durable drafts/retries and define conflict resolution.                                                  |
| Medium   | Contact removal deletes a row, after which another request can create it (`apps/edge/src/discovery.ts:189`).                                                            | Removal is not harassment blocking. Add explicit block/report policy and enforcement.                                                                                        |
| Medium   | Generic JSON uses `request.json()` without the chat reader's byte ceiling (`apps/edge/src/index.ts:149`). Board quotas count surviving posts.                           | Validation follows parsing; delete/repost bypasses a strict daily creation limit. Bound input bytes and use durable counters where needed; review gateway limits separately. |
| Medium   | `AUTH_SECRET` signs sessions and derives stable ownership/routing tags (`auth.ts`, `journeys.ts:35`, `chat-api.ts`, `chat-push.ts`).                                    | Naive rotation changes lookups. Design key separation and versioned migration; do not replace the shared test secret as a repair.                                            |
| Medium   | Push includes the chosen sender name (`apps/edge/src/chat-push.ts:135`), and service held tokens/wake metadata.                                                         | A provider or lock screen may reveal relationships. Keep disclosure explicit; consider a generic title option.                                                               |

Positive controls include authenticated encryption, purpose separated keys,
signatures, membership and accepted connection checks, bounded mailboxes/queues,
recipient scoped retrieval, expiry handling, cancellation after lock, encrypted
native state, HTTPS production origin checks, and migration activation/proofs.
Their composition still requires independent review.

The application copy also needs a later implementation change:
`packages/i18n/src/locales/en.ts:317` still says servers hold only unreadable data,
and `:411` describes an encrypted referral tree and counts only server visibility.
Those claims exceed current behavior. This documentation commit corrects the
repository's current guidance; it does not change or redeploy the website or app
copy. Review the other languages alongside that future correction.

The browser device secret sits beside its encrypted vault, so the web uses a
longer passphrase. Native storage is stronger, but keys are used in app process
memory; do not claim that all secrets remain permanently inside secure hardware.
Copied native history plus its storage key can reveal retained history. Spyware,
coercion, malicious recipients and external cameras remain limits.

External references checked for this assessment:

- [RFC 9420, section 16.6](https://www.rfc-editor.org/rfc/rfc9420.html#section-16.6): MLS recovery after compromise requires processed key updates, not merely selecting the library.
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/): storage access can require authentication; a separate UI check is a different boundary.
- [Expo push FAQ](https://docs.expo.dev/push-notifications/faq/): provider receipts are distinct from a recipient's app processing a message.
- [Cloudflare Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/): platform capacity constrains availability; free capacity is not unlimited.

These sources explain distinctions; they do not certify Tero's implementation.

### Dependency alert discovered during documentation push

GitHub reported one open moderate alert on the default branch. A read only
Dependabot API check confirmed [alert 1](https://github.com/phe-rus/tero/security/dependabot/1)
for the root Vitest development dependency, advisory
[GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)
(CVE-2026-84373). The reported affected range is `>= 2.1.0, < 4.1.11`; the root
manifest currently specifies `^3.2.4`. The alert identifies 4.1.11 as the first
patched version, so remediation requires a compatibility reviewed major upgrade.

The advisory concerns local file disclosure through a mocker development server
under specific reachability and registration conditions. It is not evidence that
Tero's deployed Worker or phone chat is remotely compromised. Determine actual
test server exposure and upgrade compatibility in a focused follow up. No exploit
was attempted and no dependency or lockfile was changed in this documentation task.
This single alert check is not a complete dependency audit.

## Impact: demonstrated and potential

Demonstrated progress is technical: implemented resource workflows, owner
confirmed phone conversations, and preserved accounts transferred to hosted tests.
There is no evidence here of population scale adoption, better health outcomes,
job placement, safer housing, emergency response or successful fundraising.

Potential impact comes from completing a practical path: find a resource, ask for
help, connect privately, and confirm a useful outcome. Directories reduce repeated
searching; stories reduce isolation; aid/jobs/skills can support material needs;
journeys organise decisions. Sefirah could improve continuity beyond one operator
once its network is built and validated.

Concentrating vulnerable people and sensitive needs also increases potential harm
if privacy, consent or moderation fails. Resource accuracy, jurisdiction specific
credentials, abusive members, response capacity, language and phone accessibility
matter as much as encryption.

Recommended measures are optional coarse feedback on useful resources/resolved
requests, delivery/recovery rates, stale listing corrections, report handling time,
and language/accessibility feedback. Define consent, aggregation and retention
before collecting anything new. Avoid message content analytics, identifiable
social graphs and small country counts. No impact measurement programme is claimed
implemented.

## Milestone assessment and next steps

M0/M1/M2/M5 have substantial implementations. M3 has real text chat with remaining
edges. M4 has Help backed Gathering and discovery, but no group community protocol.
M6 has partial local foundations. M7's independent audit is not demonstrated.
These labels are not a percentage of overall completion.

The [roadmap](roadmap.md) gives estimates, dependencies and completion criteria.
First close the focused phone evidence gaps with existing apps. Then prioritise
reliability, reporting/blocking, incident/recovery workflows, governance and
independent review before broader membership. Networking research can proceed
separately from ordinary reliability improvements.

## Documentation and review limits

The README, threat model and current entry points are refreshed by this review;
the 12 October audit remains historical. Later continuation checkpoints supersede
older unbuilt statements in specifications. The hosted testing guide also retains
older build 19 installation wording below its updated introduction; the 16 October
continuation is the current device record.

Existing AGENTS.md and CLAUDE.md remain preserved; no extra agent context files
were needed. Existing application/configuration changes, device accounts, secrets
and data were preserved and excluded from this documentation commit. Live account
inventories, store status, capacity benchmarks and private device interactions
were outside the review.
