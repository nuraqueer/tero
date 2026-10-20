# Tero roadmap and effort estimates

Planning assessment: **20 October 2026**. Read the
[current audit](status-audit-2026-10-20.md) for implementation evidence and security
findings. This is a proposed delivery order for the remaining work, not a change
to the founder's confirmed product rules or an approved technical specification.

## Starting point

Working test phones, native encrypted text chat, identity/recovery words,
invitations, resource boards, private journeys, discovery/contacts and a hosted
service exist. Independent network admission, replication, full community
conversations, moderation, incident response and social recovery do not.

The nearest useful milestone is evidence for the existing phone flows, followed
by reliable help to conversation workflows. Shipping more screens alone will not
complete that path. A hosted beta and a complete independent Sefirah network are
different milestones and should be reported separately.

## How to interpret estimates

Ranges assume one primary developer working about 25 to 35 focused hours per week,
with prompt owner decisions, access to both test phones, existing accounts intact,
and qualified reviewers available when needed. They include implementation,
focused tests, phone checks and documentation, rather than coding alone.

These are judgment based planning estimates, not measured velocity or promised
dates. New protocol design, mobile background behavior, external audit findings,
app store review, expert content work and unresolved governance rules can expand
them materially. Part time work takes longer. AI assistance does not remove the
need for physical evidence or an independent audit.

A row is an incremental scope estimate. Dependencies can overlap with specialist
help, but one developer cannot complete overlapping rows at full speed. Do not
add the optimistic endpoints and present the result as a launch deadline. No
funding or paid infrastructure is authorised by this plan.

## Immediate milestones and a bounded hosted beta

| Order | Milestone and purpose                        | Estimated effort                                                                           | Completion evidence and dependencies                                                                                                                                                                                                                                        |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Close current phone evidence gaps            | 3 to 7 working days if no new fault appears; allow 1 to 2 calendar weeks                   | Existing apps exchange real messages on separate networks with laptop off; iPhone/Android alerts, tap after unlock, sound and permission denial checked. Record exact builds, states and results. No rebuild unless a relevant defect requires it.                          |
| 2     | Reliability and data preservation            | 2 to 4 weeks                                                                               | Restart/offline/retry/duplicate, receipt and expiry cases on both phones; retain failed journey edits; recover interrupted invitation/setup state; truthful failure states; focused regression checks. Depends on milestone 1 observations.                                 |
| 3     | Minimum abuse response                       | 3 to 5 weeks                                                                               | Enforced blocking, reporting, moderator scope, removal/appeal policy, rate and byte limits, response procedures and minimal evidence retention. Removal must not be mistaken for blocking. Requires product rules for what reports may retain.                              |
| 4     | Incident, revocation and recovery foundation | 6 to 10 weeks                                                                              | Durable protected referral records, explicit duress flow, stolen account/device response, directory key rotation, recovery approvals/waits, safe failure during disconnection. Resolve authority and freshness rules first. A decoy screen alone is not completion.         |
| 5     | Review security boundaries and operations    | 3 to 5 weeks                                                                               | OS enforced storage assessment, MLS update/healing scope, secret rotation migration, metadata/board privacy policy, backup/restore drill, capacity limits, release signing and incident ownership documented and checked. This may overlap milestones 2 to 4 but adds work. |
| 6     | Independent audit and remediation            | Reserve 4 to 8 weeks of review/remediation; external booking may add 4 to 12 weeks or more | Qualified external review of native state, crypto integration, APIs, recovery and threat model; significant findings corrected and retested. Depends on a stable bounded scope. This document is not that audit.                                                            |
| 7     | Small invited beta in safer settings         | 2 to 4 weeks of observation after gates pass                                               | Complete core flows, reviewed content/translations, available moderators, explicit consent and limitations, tested support/rollback process. Measure useful outcomes without invasive analytics. No automatic expansion to high risk users.                                 |

An indicative **4 to 8 months** to a narrowly scoped hosted beta is plausible
under those assumptions, with overlap and deliberately bounded scope. Audit
availability or substantial redesign can push it later. This is not a promise to
finish all governance, all safety scenarios, or the independent network in that
period. Before beta, explicitly decide which paths are supported, which features
are disabled, and whether residual privacy risks fit the proposed participants.
A high risk rollout needs its own reviewed threat evidence and operating plan;
there is no responsible fixed date for it yet.

## Community and support services

These can be prioritised after reliability and minimum abuse handling, with
protocol and moderation specifications before implementation.

| Workstream                                       | Incremental estimate                                         | What must exist before calling it complete                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Circles, topics and group messaging              | 6 to 10 weeks                                                | Native MLS group changes, invitations/removal, history policy, concurrent updates, moderation/report boundaries and real group device checks               |
| General posts, events and polls                  | 4 to 7 weeks                                                 | Real publication, permissions, edit/delete/expiry, reporting, offline/error behavior; general publishing is broader than Gathering's current Help feed     |
| Professional verification and following          | 6 to 10 weeks                                                | Country/category scoped credentials, protected evidence handling/deletion, decisions, expiry/revocation, badge audiences and listing/following permissions |
| Partner confirmation and resource freshness      | 3 to 6 weeks after credentials                               | Real partner protocol, stale listing corrections, unknown/aware/verified distinctions and clear explanation of what a match proves                         |
| Images, voice notes and professional files/forms | 5 to 9 weeks                                                 | Encrypted attachments, metadata removal, size/expiry rules, offline retries, safe opening and report policy; voice notes limited to one minute             |
| Anonymous listening                              | 4 to 8 weeks after moderation                                | Private matching, eligibility, consent, blocking/reporting, safeguarding, capacity limits and honest lack of guaranteed response                           |
| Country packs and crisis/map resources           | 3 to 6 engineering weeks; ongoing expert work                | Sourced/datable policy and resources, authorised updates, coarse location, stale notices and specialist review. Do not invent legal or medical facts.      |
| Marketplace                                      | 3 to 6 weeks after moderation                                | Allowed item rules, one week expiry, listing reference in chat, enforcement, location/privacy controls and no payment before delivery policy               |
| Beacon and trust progression                     | 5 to 9 weeks after governance                                | Country constrained discovery, consent and verification, completion evidence, pair cooldown, abuse resistance and signed progression rules                 |
| Wallet and fundraisers                           | 6 to 12 weeks plus specialist review                         | Noncustodial flows, recovery, chain/provider choice revalidation, fees, scam/report handling and distinction between transfers and legitimate outcomes     |
| Broader journeys and coordination                | 4 to 8 engineering weeks per bounded service                 | Actual partner/professional capacity, consent, jurisdiction review and separate medical/legal/travel workflows; no booking claim from checklists alone     |
| Language, accessibility and content quality      | 2 to 4 weeks initial engineering remediation; ongoing review | Native language review, assistive technology checks and qualified content owners; four dictionaries are not proof of four reviewed experiences             |

These are separate options, not a recommendation to launch all of them together.
Prioritise evidence that members can find useful help over growing the feature count.

## Sefirah network and governance programme

| Workstream                                        | Incremental estimate                                                    | Completion evidence and dependencies                                                                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed membership and authority protocol          | 6 to 12 weeks                                                           | Resolve issuance, revocation, card/handle conflicts, vote eligibility, offline freshness and partitions; implement independently checkable credentials. Some work overlaps recovery, so reestimate shared scope rather than count it twice. |
| Automatic private discovery and route validation  | 6 to 12 weeks                                                           | Both platforms find eligible peers/nodes, preserve peer IP privacy, show truthful route status and survive network changes without requiring central discovery                                                                              |
| Durable replication and synchronization           | 10 to 20 weeks                                                          | Independent nodes preserve encrypted objects across nonoverlapping sessions, duplicate/conflict/deletion rules, quotas, chunk resume and graceful capacity exhaustion                                                                       |
| Community node and organisation interoperability  | 5 to 10 weeks after core protocol                                       | Documented independent operation, version negotiation, organisation isolation, key management and compatibility tests                                                                                                                       |
| Nearby exchange                                   | 8 to 16 weeks                                                           | Real iOS/Android transfers without internet, privacy reviewed radio discovery, permissions, replay resistance, queued later synchronization and physical device evidence. Direct LAN exposure is not automatically allowed.                 |
| Calls and Spaces                                  | 10 to 20 weeks after a measured media feasibility phase of 2 to 4 weeks | Primary and fallback media meet encryption, peer IP privacy, mobile latency and bounded capacity requirements; calls up to four, Spaces up to six speakers plus listeners. Provider/transport remains undecided.                            |
| Council voting, succession and full governance UI | 8 to 14 weeks after authority rules                                     | Enforced permissions, badge audiences, pending revocation restrictions, 24 hour windows, veto/tie rules, restoration approvals, audit records and partition cases                                                                           |

A constrained independently operating Sefirah pilot may require **9 to 18 months
or more** with the same single developer also maintaining Tero. The wider product
and network vision could take **18 to 36 months or more**. These are broad order of
magnitude ranges with low confidence, not additive forecasts or a commitment to a
particular team size. Audio and nearby privacy feasibility may change the design.

## Old milestones mapped to current status

| Original milestone   | Current reading                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| M0 foundations       | Substantially implemented; current full checks were not rerun for this document change                                              |
| M1 identity and lock | Core implemented, with biometric/storage and device edge review remaining                                                           |
| M2 invitations       | Core implemented; retained referral governance and recovery relationships remain                                                    |
| M3 private chats     | Real native text chat confirmed; original keep/screenshot wording is superseded by later expiry rules; lifecycle and healing remain |
| M4 Circles/Gathering | Help backed feed and member discovery exist; group communities, general publishing and moderation remain                            |
| M5 public site       | Implemented with two populated guides and incomplete content review                                                                 |
| M6 safety            | Decoy/phrase recovery foundations; duress, social recovery, country policy and full incident workflows remain                       |
| M7 hardening         | Tests and source review exist; independent audit is not demonstrated                                                                |

## Decisions that determine the schedule

Resolve supported beta scope; report/block retention; encrypted board audiences;
referral and incident authority; recovery evidence and offline revocation rules;
MLS update and state recovery policy; country/professional content ownership;
organisation governance and capacity budgets. Audio and nearby route choices need
measurements before promises.

Each completed slice should update the handoff, implementation evidence and this
roadmap with actual effort. Reestimate after the first reliability slice and each
protocol experiment. Elapsed calendar time and new screens are not evidence that
a milestone's protection works.
