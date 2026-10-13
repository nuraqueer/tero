# Confirmed Tero governance contract

## Summary

Keep personal identity, tarot assignments, current authority, and displayed badges separate. Implement these rules only after the record authority and conflict protocol are specified. This file consolidates confirmed product rules, not a claim of implemented governance.

## Confirmed rules

| Area                  | Rule                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity              | Account keys authenticate. Tero handles are unique personal names. Display names and tarot cards are separate. The Fool can be `@laniina`, display `La niina`, card The Fool.                             |
| Cards                 | The Fool card is never reassigned. Acting Sequence 0 retains their own card and handle. Council cards return to rotation only after authorised revocation.                                                |
| Referrals             | Ordinary invitations retain inviter links, for example Annet → Jena → James. Council members have independent referral roots; appointment provenance is separate.                                         |
| Governance visibility | Fool and council can inspect the full roster and referral graph but not private conversations. Governance data is encrypted for its readers.                                                              |
| Moderator appointment | Fool or a council member appoints directly without voting. Moderators may invite members.                                                                                                                 |
| Professionals         | Any member can request a supported credential category and submit one-time evidence. Council approves by vote, or Fool approves directly and ends that vote. Badge scope does not grant governing powers. |
| Badge audience        | Members see moderator and professional badges. Only Fool and council see Fool and council badges.                                                                                                         |
| Member incident       | Moderators handle; moderators and inviter alerted, council informed. Earlier references can assist if inviter unavailable. Leadership intervention is optional.                                           |
| Professional incident | Council handles.                                                                                                                                                                                          |
| Fool incident         | Explicit compromise/decoy alert starts temporary succession using the Fool's configured council order. Offline status alone is not a trigger. Council is alerted.                                         |
| Fool restoration      | First two successors informed, at least three council approvals, and a 24-hour wait. Acting holder returns to Sequence 1.                                                                                 |
| Council restoration   | 24-hour wait; further approval details unresolved.                                                                                                                                                        |
| Revocation authority  | Fool may revoke council authority directly; council otherwise votes subject to Fool veto.                                                                                                                 |
| Revocation vote       | Live council audio call, all council notified, 24-hour window. More revoke than retain votes wins, subject to veto. Ties or no votes mean no revocation; case restrictions lift at closure.               |
| Pending revocation    | Target is restricted to reads plus speaking/listening in council audio and council comments. No other actions; card not released merely by opening the case.                                              |

## Protocol work still required

Founder additions confirmed on 2026-10-13: handles remain permanently attached to their account; display names can change. Moderators are Sequence 2. Verified professionals improve by two levels, capped at Sequence 2 (9 to 7, 4 to 2). Ordinary members may progress to Sequence 2, never into council or Fool authority merely through ratings. Only the first completed Beacon between the same pair within 30 days contributes promotion stars. Higher level thresholds and authoritative rating verification remain undecided. Professional card variants and controlled reassignment need a protocol that preserves council seat constraints and the permanent Fool card.

Screenshot exceptions are a distinct unanimous council decision: every eligible council member must approve, abstention prevents the change, and the Fool cannot veto. This does not change the existing revoke versus retain majority rule for council revocations. Country moderator scope and professional jurisdiction qualifications also need signed authority records. See the umbrella's founder additions for the full requested community behavior.

Define signed authority roots, credential issuance, atomic handle and card claims, voting eligibility, minimum turnout, proposal authority, safe return evidence, veto authentication, succession-order eligibility, and handling of overlapping incidents. Resolve live call attendance versus the 24-hour ballot window. Define stale credential handling and conflicting authority transitions during partitions.

The network cannot instantly deliver new revocations to disconnected nodes. No signer alone establishes membership or makes a conflicting authority transition valid. Do not implement automatic takeover or restoration until these rules have an explicit, independently checkable protocol.
