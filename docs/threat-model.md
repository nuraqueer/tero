# Threat model

Current assessment: **20 October 2026**. This separates protections in the source
from intended future defenses. Read the [project audit](status-audit-2026-10-20.md)
and [roadmap](roadmap.md) for findings, evidence and priorities. There is no
independent security audit recorded here. This document does not certify safety
for high risk use.

## Assets and trust boundaries

Protect recovery words and identity keys, message plaintext and retained state,
private journey plans, discoverable profiles, membership and referral records,
connection/activity metadata, sensitive Help submissions, push tokens and incident
records. Confidentiality, correct authorization, availability and recoverability
are separate requirements.

The current product trusts a central Cloudflare registry for admission, roles,
handle uniqueness and connection state. Sefirah's independent membership and
transport model is the target, not the present authority boundary. Device operating
systems, Expo/FCM/APNs, packaging/signing infrastructure and the delivered app code
also affect safety. Invite only does not mean infiltrator proof.

## What data is protected from whom today

| Data                                            | Current boundary                                                               | Important limit                                                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recovery phrase and vault                       | Two padded encrypted slots; passcode plus device secret; native secure storage | App code uses secrets in memory. Phrase export creates a readable file outside the vault.                                                             |
| Browser vault                                   | Encryption and longer passphrase                                               | Device secret sits in the same browser storage; copied storage permits offline guessing. Compromised delivered web code can capture unlocked secrets. |
| Private text messages                           | Native OpenMLS and encrypted local state; encrypted carrier wrappers           | Service still sees pair and traffic metadata; endpoint/recipient compromise remains. Epoch healing and lifecycle evidence are incomplete.             |
| Personal journeys                               | Device encryption and version checks; service stores a box                     | Owner lookup/availability still depend on service secrets; failed local edits lack durable retry.                                                     |
| Directory profiles                              | Signed ciphertext with grants to a shared member directory key; device search  | Admitted members can read/copy profiles. Revocation requires future key rotation; plaintext cannot be recalled.                                       |
| Help posts, stories, jobs, listings and replies | Member access checks and HMAC author/responder tags                            | Text is service readable. Server secret plus member roster can link pseudonyms. Author only reply access is not encryption from the operator.         |
| Membership and connections                      | Server authorization and database permissions                                  | Stable account keys, roles and connection pairs are readable to the service; full encrypted referral governance is unbuilt.                           |
| Push                                            | Generic message body and encrypted recipient scoped tap pointer                | Title contains sender display name by owner choice. Providers see tokens, timing and title; server holds registrations and wake metadata.             |

Do not promise that Cloudflare stores only ciphertext, that peer routing hides all
traffic metadata, or that all keys remain permanently inside secure hardware.

## Threats, current controls and remaining work

| Threat                                                | Current controls                                                                                     | Remaining exposure or planned defense                                                                                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State surveillance, disclosure requests and blocking  | Encrypted messages/journeys/profiles; pseudonymous accounts; native Tor foundations                  | Central metadata and Help text remain exposed to operator disclosure; independent network, governance encryption and blocking resistance are incomplete. No universal ECH or anonymity guarantee.    |
| Infiltrating or malicious members                     | Invitation approval, member access checks, accepted contacts, content removal by authorised roles    | Invitations do not establish safe intent. Reporting, blocking, banning, trust progression and incident operations remain incomplete.                                                                 |
| Forced phone access                                   | Passcode vault, basic decoy view, manual lock, optional biometrics with coercion warning             | Decoy sends no alert. Current background grace is 30 minutes. Biometrics open the full account. Panic wipe, social recovery and automatic incident restrictions are not implemented.                 |
| Device theft or key theft                             | Device storage, passcode stretching, wrong attempt delays, phrase recovery                           | OS compromised devices and stolen phrases are serious compromises. Full revocation, device replacement and recovery authority remain unfinished.                                                     |
| Biometric gate bypass within app context              | App requests biometric authentication before seed retrieval                                          | Stored seed lacks an item level `requireAuthentication` setting. Assess storage enforced authentication, enrollment change handling and platform differences. No remote exploit is established here. |
| Server breach or malicious service                    | Independent signatures/encryption for protected content; chat checks membership/contact state        | Membership assertions remain central; operator can read boards/metadata, deny service or serve stale data. HMAC tags are pseudonyms, not anonymity against the secret holder.                        |
| Screenshots, recipients and blackmail                 | Pseudonyms, content notes, limited chat retention                                                    | No complete screenshot policy enforcement or report workflow. A recipient or external camera can retain content; screenshot detection cannot prevent that.                                           |
| Scams, false listings and credentials                 | Vouches, submission limits, authorised content removal                                               | No full professional/country credential lifecycle, partner verification, marketplace or fundraiser enforcement. Vouches are experiences, not professional certification.                             |
| Rogue administrator                                   | Existing API role checks and no message decryption keys intentionally supplied to admins             | Voting, moderator appointments/scopes, signed logs, pending case restrictions and succession remain unbuilt. Code/deployment control is a separate powerful trust boundary.                          |
| Loss, restart, weak connectivity and quota exhaustion | Encrypted native pending state, mailbox bounds/expiry, explicit fallback, preserving transfer proofs | Journey draft recovery, complete phone edge checks, replica durability, independent discovery and capacity budgets remain. A storage receipt is not peer delivery.                                   |
| Stale or compromised cryptographic state              | Authenticated snapshots, identity/peer binding, replay checks                                        | MLS epoch updates/healing and snapshot recovery require further work. A storage key plus an old snapshot can reveal retained history.                                                                |
| Platform or domain takedown                           | Source available; Android standalone and TestFlight tests exist                                      | Public access, app distribution and central membership remain dependencies. Independent nodes, signed offline distribution and nearby sync are future work.                                          |

## Lock, expiry and recovery semantics

A cold app start requires unlock. Manual lock clears the full session and closes
owned engines/transports. Returning after 30 minutes away locks; briefly switching
apps does not. Process suspension is not reliable scheduled background cleanup.
App memory clearance is best effort, not a guarantee that every runtime copy is
forensically erased.

Unread chat expires after seven days, shortened to 24 hours after both read times.
Native operations remove expired history/retry bytes; the stopped app does not
promise timed deletion. Carrier mailbox alarms are a separate mechanism. Hash
records and ratchet state can remain for replay safety. Old storage copies and a
recipient's independent copies are outside this deletion guarantee.

Phrase restoration restores identity and seed derived secrets. It does not by
itself restore the peer's current ratchet, revoke a stolen phrase or complete
social recovery. Recovery and revocation need a specified device/state policy.
The decoy is a local basic view, not emergency notification or a complete coercion
response system. Partner changing words, social recovery and succession must not
be inferred from UI placeholders.

## Data and operational rules

1. Collect only what a service needs and explain the actual reader audience.
2. Specify encryption and metadata boundaries per data type before migration.
3. Retain referral/incident evidence only under a reviewed access/retention model.
4. Professional verification evidence needs a deletion policy before that service starts.
5. Use coarse location; a city and story can still identify someone in combination.
6. Preserve existing accounts, device state and service secrets during development.
7. Plan versioned secret rotation, backups and restore drills before relying on them.
8. Treat push acceptance, carrier storage, peer delivery and peer read as distinct evidence.
9. Validate private routes against peer IP exposure; no silent direct network downgrade.
10. Require reviewed threat evidence and incident capacity before expanding participant risk.

## Verification still needed

Focused physical checks should cover delivery on separate networks, notification
permissions/taps/sound on both platforms, restart/lock/background transitions,
receipt truthfulness, expiry, compromised identity response and failed saves.
Further review should cover native storage enforcement, MLS key updates,
directory rotation, abuse controls, request limits, secret rotation, migration and
capacity exhaustion. Avoid repeating builds or broad suites without relevant changes.

An independent reviewer should assess the composed product and supported workflows
before a broader beta. High risk deployment needs its own decision and evidence.
No software can guarantee safety against spyware, coercion, a malicious recipient,
external recording or a network outage.
