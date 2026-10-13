# Tero early development progress, 12 October 2026

You started development about a week ago. Tero is in early development, with a working foundation and several implemented resource features. The larger product goal is still ahead, and the roadmap is still taking shape. Unbuilt features below are future work, not overdue commitments or evidence that this first week is incomplete.

Read this as a snapshot of what exists today and possible next steps, not a launch review. The original audit placed too much emphasis on release readiness for this stage. Privacy and safety observations identify decisions to revisit as the relevant features develop; they do not mean you need to finish the entire safety architecture now.

This review compares the source at commit `4fa4db1` with `docs/build-plan.md`, the decisions in `docs/README.md`, the architecture and threat model, and the project notes in `CLAUDE.md`. It checks implementation and local verification. It does not verify the current production deployment, EAS releases, store listings, account access, or an independent security audit.

## Milestone status

| Milestone | Status | Evidence and remaining work |
| --- | --- | --- |
| M0, foundations | Substantially implemented | Bun workspaces, TypeScript, CI, shared crypto, protocol, design tokens, and four language dictionaries exist. Local formatting currently fails. CI runs formatting rather than a separate lint command. |
| M1, identity and lock | Core implemented | Seed and recovery phrase, key derivation, signed challenges, encrypted vault, real and decoy passcodes, retry delays, manual lock, and lock after 30 minutes away exist. Native biometric behavior still needs device verification. |
| M2, Tero cards | Core implemented, broader spec incomplete | Create, QR scan or link claim, confirmation code, approval, expiry, destruction, and council invitations exist. Tests cover the API joining flow. Secret personal and bond cards, encrypted invite accountability, and professional invitations are not implemented. |
| M3, private chats | Not implemented | Chat and Messages are preview layouts. OpenMLS was selected but has no binding or runtime integration. Relay, delivery, persistence, expiry, mutual retention consent, and screenshot detection remain. |
| M4, Circles and Gathering | Not implemented beyond layouts | Circles and Gathering show empty states. Compose has six types but its publish button is disabled. Circle conversations, topics, posts, reports, and the moderation workflow remain. |
| M5, public site | Implemented with incomplete content | Public home, guide index, guide pages, and language selection exist. Two of six listed guides have text. Four are still being written. Translation quality needs native speaker review. |
| M6, safety | Partial foundation only | Decoy view and phrase restoration exist. Duress delivery, server freeze, linked device revocation, card recovery, 24 hour wait, social recovery, and country risk packs remain. |
| M7, hardening | Not demonstrated | Automated tests exist, but no independent security audit report or completed launch review was found. |

## What is implemented

The Expo app has mobile navigation, the You screen, recovery words, language selection, invitations, and a separate web console. The console supports overview counts, invitation management, recovery words, and role explanations. Founder, council, and member roles exist.

The Cloudflare Worker serves the API and web assets. A SQLite Durable Object stores registry and Help data. The current configuration has no D1 or R2 binding and no messaging mailbox object. Those parts of the architecture remain proposed.

Six Help feature types have screens, protocol validation, routes, database storage, and backend tests:

| Feature | Implemented behavior | Boundary |
| --- | --- | --- |
| Directories | Seven directory categories, submissions, country and city fields, search and filters, vouches, removal, submission limits | Professional verification and partner approval workflows remain. |
| Mutual aid | Requests and offers, replies visible to the author, closing, removal, expiry and posting limits | Reply text is readable by the server. Private messaging is unavailable. |
| Jobs | Openings, application contact, search and filters, removal, expiry and posting limits | No hiring or placement workflow. |
| Stories | Topics, content notes, optional country, thanks, removal and posting limits | No complete report, block, or moderation workflow. |
| Skills | Teaching, learning, linked resources, replies, removal and posting limits | Replies use the same server readable note model as mutual aid. |
| Journeys | Templates, custom plans, steps, encrypted upload, restore from the seed, and version conflict checks | This is a personal planner. Consultations, booking, verified coordination, and travel handovers remain. |

The Help mapping has 16 destinations. Twelve use implemented feature types (seven directories plus mutual aid, jobs, stories, skills, and journeys). The other four are Someone to talk to, Communities, Fundraisers, and Show my Tero card. The last displays dots and a countdown rather than an actual partner verification code. Crisis support and Map are also preview screens.

## What has not been implemented

The main community work is private messaging, Circles, Gathering posts, events, polls, media uploads, live delivery, and notifications. Spaces audio, professional calls, voice disguise, subtitles, danger reactions, and safe words are also absent.

The main governance work is reporting, blocking, banning, moderator permissions, professional verification, council voting and quorum, veto and removal flows, country administration, and the append only action log. Existing permissions allowing the Fool or council to delete Help content do not provide these workflows.

Sequences are assigned on joining, but contribution based advancement, weighted trust, inactivity decay, penalties, and the full sensitive feature access model remain. The registry explicitly defers the encrypted invite tree to later council tools.

The main safety work is silent duress alerts, recovery contacts, server access freezing, session revocation, panic wipe, social recovery, personal and bond card recovery, cancellation during the 24 hour wait, country risk enforcement, and signed offline bundles. Restoring the same keys with 12 words is implemented; replacing compromised keys is a separate missing workflow.

Account deletion and coordinated server data removal are absent. QR device linking is absent. The repository has EAS configuration, but configuration alone does not demonstrate installed native builds, TestFlight distribution, store submission, a PWA fallback, or an Android download release.

Later product work includes wallets and donations, verified fundraisers, professional consultations, partner verification codes, wills, travel handover trust, Tor, and mesh research.

## Things to keep in view as development continues

1. **The server readable data exceeds the stated encryption promise.** `README.md`, `docs/architecture.md`, and `docs/threat-model.md` broadly claim ciphertext only. The schemas and insert operations in `apps/edge/src/aid.ts`, `skills.ts`, `jobs.ts`, `stories.ts`, and `registry.ts` store Help text and contacts directly. HMAC pseudonyms hide direct author identifiers, but do not encrypt content. Journeys do encrypt their contents on the device. You should decide the intended privacy boundary and make implementation and public claims agree before launch.
2. **The decoy does not send help.** `openBasic` in `apps/app/src/lib/session.tsx` clears the in memory full session and opens the harmless view. Its comment reserves the duress alert for M6. There is no alert delivery or server freeze implementation behind it.
3. **Governance and abuse response are incomplete.** Member submitted Help features exist before reporting, blocking, bans, and the moderator workflow. You should complete these before admitting real members.
4. **Some safety destinations have no working service.** Crisis links to the unfinished anonymous support destination and the guide `when-you-need-someone`, whose text is null. The map and partner code screen are also previews.
5. **Documentation is stale.** The README says nothing is built. The architecture still mentions Signal for individual chats despite D39 choosing OpenMLS for all chats. `DEVELOPING.md` names an old workers.dev API address, while the app defaults to `tero.pherus.org` and workers.dev is disabled. The full M2 and M5 definitions should not be treated as complete merely because project notes say done.
6. **Checks have limits.** There are no tests under `apps/app/src`. Backend and shared library tests do not prove navigation, device lock behavior, QR scanning, biometric unlock, sharing, or real mobile joining. The app also has no lint script.
7. **Configuration needs cleanup.** Android permissions in `apps/app/app.json` are duplicated. That tracked file fails formatting. A generated, ignored `apps/app/expo-env.d.ts` also fails local formatting, so the current formatting command includes generated files.
8. **Secret rotation needs a data plan.** D42 documents that changing `AUTH_SECRET` loses the association between members and their existing pseudonymous submissions. Other Help boards also derive ownership from that secret. You should separate token signing from stable ownership derivation or plan a migration before routine rotation.

## Verification

The starting tracked worktree was clean. Bun was unavailable on the shell PATH, so the installed tools were run directly with the bundled Node runtime.

| Check | Result |
| --- | --- |
| Vitest across the repository | 142 tests passed in 18 files |
| TypeScript across all six workspaces | Passed |
| Expo web export | Passed, 62 static routes, output in /tmp/tero-audit-web-20261012 |
| Prettier over apps and packages | Failed on app.json and generated expo-env.d.ts |
| Independent security review | No report found |
| Phone or browser interaction tests | Not performed in this audit |
| Production deployment and store state | Not verified |

## Second pass: aim and goal

The current direction, especially D49 and D50, is a community driven resource platform for LGBTQIA+ people: queer knowledge, resources, community, and support. The tarot club is an inspiration for identity and governance rather than the purpose of the product or its public presentation.

The long term aim has three connected parts:

1. Let anyone access useful public knowledge without joining.
2. Let vouched members find practical help and help each other without being required to provide names, emails, or phone numbers.
3. Make recommendations and services more trustworthy through community experience, professional verification, moderation, and accountable governance.

Privacy and safety support that aim. Identity keys, invitation cards, Sequences, and the council are mechanisms, not the end goal. Their value is whether they make finding and receiving help easier and safer.

The present implementation supports the first two parts in an initial form. You can publish guides, create identities, invite members, share resources, and keep personal plans. The social connection and trust operations that tie the whole platform together are mostly still future work.

My assessment: the aim is coherent, but broad. Health, jobs, legal help, community conversations, voice, money, and recovery each introduce different workflows. It makes sense that one week of development has established some building blocks without starting the full experience. No overall completion percentage would be meaningful while that experience and its scope are still evolving.

## Second pass: review of the product logic

| Product logic | What makes sense | What is still open or incomplete |
| --- | --- | --- |
| Public knowledge plus private community | Public guides can help someone who has no invitation; membership protects member submissions from public browsing. | Decide which additional resources should be public. Current Help APIs require membership. |
| Keys as identity | The same recovery phrase reproduces the same identity without an email account. Membership is checked separately on the server. | Lost words, stolen words, key replacement, device revocation, and recovery contacts need their own flows. |
| Invitations as a trust starting point | A single use invite plus an in person code ties approval to the intended claiming key. | An invitation is not proof that every future action is trustworthy. Ongoing trust and abuse handling remain. People with no trusted contact also need a clearly considered joining path. |
| Community recommendations | People can add and vouch for places without exposing a direct author identifier in the listing. | A vouch is experience, not professional verification. Current counts are not weighted trust or evidence that a place is suitable for every person. |
| Help boards | Requests, offers, jobs, stories, and skills each have a useful small workflow. | Replies are single notes, not conversations. There is no complete follow through from asking, to talking, to receiving help, to confirming an outcome. |
| Journeys | A private planner is a useful independent feature and a sensible early use of device encryption. | Planning steps does not yet connect someone to verified providers, estimates, bookings, or travel help. |
| Cards and permissions | The registry stores card appearance, Sequence, and role separately. Ordinary members can share a card name without sharing council powers. | The implementation has one role field with three values. The documented ability to combine member, professional, moderator, and council responsibilities is not implemented. |
| Council oversight and moderation | Separating governance from everyday moderation gives each a clear responsibility in the design. | Current Help deletion permissions belong to the Fool and council. This is an interim model, while the intended moderator role and oversight process remain absent. |
| Privacy plus accountability | Publicly hidden authors can still have ownership and submission limits. | Server keyed pseudonyms allow an operator holding the secret and member list to associate authors. Decide this boundary explicitly for each type of content. |
| Duress and recovery | Alerting trusted people and delaying restoration can be designed as a connected workflow. | That workflow depends on recovery contacts or an invite relationship that the current registry discards after approval. The contact model must be designed alongside the alerts. |
| Partner confirmation | Distinguishing a recommendation from a verified Tero partner is useful. | Matching changing words still needs a defined protocol, credential issuance, expiry, revocation, and an explanation of what the check proves. A matching display alone should not be treated as proof of professional quality. |
| Fundraisers | Separating a fundraiser address from the identity has a clear intended purpose. | A transaction total would show transfers to an address, not prove the legitimacy of a request or that help reached the intended outcome. The future trust workflow must cover that distinction. |

The most important product dependency is between the boards and conversations. The boards already let someone express a need or offer, but private conversation and outcome confirmation are not there yet. That explains why the main goal can still feel unstarted even though several features contain real code.

## Second pass: source logic observations

These observations come from reading the code. They were not reproduced through browser or phone interaction during this audit. They are items to investigate when developing those flows, not instructions to fix everything now.

| Observation | Source | Implication |
| --- | --- | --- |
| A claimed invite's phrase, card ID, and confirmation code live in React state until setup saves the vault. | `apps/app/src/lib/session.tsx`, `startJoin` and `finishSetup` | Closing the app before saving can lose the claiming keys while the invite stays claimed. |
| Normal unlock restores the seed but does not restore pending join metadata. | `apps/app/src/lib/session.tsx`, `unlock` and `openFull`; `apps/app/src/app/(tabs)/you.tsx` | Locking before approval loses the displayed pending confirmation code. The key can still be approved, but the waiting flow cannot fully resume. |
| Waiting membership polling exists on the You screen, but not on the web console waiting view. | `apps/app/src/app/(tabs)/you.tsx`; `apps/app/src/app/admin/index.tsx` | A council newcomer who joins on the web has no automatic membership refresh in that waiting screen. |
| Sessions expire after 12 hours; the app stores the token but does not schedule renewal or retry sign in on a 401. | `packages/protocol/src/index.ts`; `apps/app/src/lib/api.ts`; `apps/app/src/lib/session.tsx` | A continuously open app can retain an expired session. Locking and unlocking creates a new one. |
| Initial sign in failure marks the session offline, with no automatic reconnect path in the session provider. | `apps/app/src/lib/session.tsx`, `connect` | Returning connectivity alone does not trigger sign in again. Recovery from an offline unlock needs a flow. |
| Failed journey uploads clear the pending save; conflicts reload the stored book. | `apps/app/src/components/Journeys.tsx`, `flush` | There is error feedback, but no durable retry queue or merge. Unsaved local edits can be lost when the screen reloads. |
| Submission limits count rows still present in each board. Removing a submission deletes its row. | `apps/edge/src/aid.ts`, `jobs.ts`, `stories.ts`, `skills.ts`, `registry.ts` | Deleting and reposting bypasses a strict interpretation of a daily creation limit. Decide whether the intended rule limits creations or surviving posts. |
| Most lists return at most 300 rows; directories return 500, and search runs on those returned rows. | Board list methods and `Registry.listPlaces` | Older content beyond that cap cannot be found through the current client search. Pagination can wait until volume warrants it. |
| Expiry cleanup runs when relevant API methods are called, rather than through scheduled deletion. | `AidBoard.prune`, `JobBoard.list`, `Registry.prune` | Expiry is enforced on access, but data can remain stored longer if no relevant request arrives. |
| The directory's awareness checkbox defaults to false, independently of verified status. | `apps/app/src/components/Directory.tsx`, `PlaceForm` | An unverified place can lack the explicit not aware warning. Unknown, member reported awareness, and verified partner status need clear meanings. |
| Authentication tokens and stable data pseudonyms use the same secret. Journeys also use that secret to derive their storage owner. | `apps/edge/src/registry.ts`; `apps/edge/src/journeys.ts`; board constructors | Rotating the secret changes ownership lookups, including journeys, even when the member still has the correct encryption key. A future rotation strategy needs to preserve data access. |

## Second pass: what exists outside the features

You also have product and architecture documents, a decisions log through D50, a threat model, a milestone plan, app store planning notes, a license and contributor agreement, 21 HTML screen mockups, screenshot rendering scripts, shared design tokens, and automated contrast checks for selected color pairs. These are useful development assets, not completed product services.

The code is organized into six workspaces: the Expo app, the Cloudflare Worker, crypto, protocol, translations, and UI tokens. Runtime data currently lives in one registry Durable Object. There is no implemented native chat binding, media storage service, public content database, signed bundle service, wallet package, or voice service.

The root has legacy project guidance in `CLAUDE.md` and mobile guidance in `apps/app/AGENTS.md`. This review leaves those curated files unchanged. Several documents retain earlier decisions: the README still describes a design only project and tarot suits; the design document retains older Help grouping and wordmark details; the architecture retains the older individual chat choice. D39 through D50 and actual source provide the more recent direction where they disagree.

## Second pass: verification and stopping point

Tests and TypeScript were rerun after the second source review. All 142 tests across 18 files pass, and all six workspaces pass TypeScript. Formatting still fails on `apps/app/app.json` and the generated, ignored `apps/app/expo-env.d.ts`. The earlier web export in this session passed with 62 static routes; application source has not changed since that export.

The tests cover shared crypto, protocol validation, language dictionary consistency, selected contrast ratios, authentication, invitations, registry behavior, and Help backend logic. They do not cover app screen interactions, native authentication, offline transitions, interrupted onboarding, journey UI saves, or all cross feature flows. Structural translation tests do not establish translation quality.

The audit does not inspect external deployment accounts, current production data, store releases, or live member behavior. It makes no finding that a real service was deployed or that every phone flow works.

No application code, configuration, curated planning documents, or dependencies were changed. Only this audit report was updated. No implementation work follows this review until you give further direction.
