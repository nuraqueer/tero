# Roles, cards, Sequences and invites

There are four separate kinds of people. A person can be more than one,
but the powers never mix.

| Role | What they do | What they can't do |
|---|---|---|
| **Card holders (council / admins)** | Govern, verify professionals, vote, oversee moderators and countries | Moderate content day to day; read private messages |
| **Moderators** | Moderate the platform: reports and content | Vote, verify, change roles |
| **Professionals** | Existing members with verified category-specific credentials; offer professional information, counselling, or services within that category | Moderate or govern because of the badge; claim unrelated verified qualifications |
| **Members** | Everything else, by Sequence | — |

Chain of oversight: **the council oversees the moderators and their
countries; moderators oversee the platform.**

## Appointments and badge visibility

The Fool or a council member can appoint a moderator directly, without a council vote. The appointment grants moderation permissions and a moderator badge; it does not grant council voting or professional credentials.

The Fool and council members also have role badges. Those leadership badges are visible only to the Fool and council members, not to ordinary members. Badge visibility is separate from the underlying authority, and hiding a badge in the interface alone is not an access-control mechanism: data delivered to an unauthorised viewer must not include a hidden badge field.

Professional and moderator badges are visible to members. Fool and council badges remain visible only to the Fool and council. Member-visible does not imply exposure to signed-out visitors or the public network. These badges and audience controls are not implemented.

The card is what people **see**. Permissions are stored as a separate
role underneath, so cards can be renamed or reordered without touching
security.

## Member identity: username and tarot card

Founder clarification, 12 October 2026: every member has a unique username alongside their tarot identity. A card alone is not a unique account identifier, and a username is not an authentication credential. The account's keys establish identity; independently verified role grants establish permissions.

Handles, display names, and cards are separate. For example, the Fool may have handle `@laniina`, display name `La niina`, and card `The Fool`. Holding that card does not require or automatically grant the handle `@thefool`.

The Fool card is never reassigned. Council cards remain with their holders during temporary acting duties, but an authorised revocation can return a council card to rotation. This latest clarification supersedes the earlier lifetime no-reassignment rule for council cards. The Fool may revoke and return a council card to rotation; council-initiated revocation requires the democratic council vote described below. Merely going offline or entering emergency recovery does not automatically release a card.

The system needs verifiable assignment and revocation history that survives offline replicas returning, without publishing personal information to the public network. Ordinary membership must not grant an exclusive council identity merely because a card image or name matches it. The ordinary-member deck and full reserved council deck still need specification.

Handles are unique across Tero: an assigned handle cannot also belong to someone else. Other organisations' naming policy is not established by this Tero rule. Normalization, concurrent offline claims, and rename/reuse rules still need specification. Until a claim is settled, a disconnected device cannot promise uniqueness. These requirements are not implemented: the current account model has no handle field, and council allocation checks current holders and pending invitations rather than a verifiable assignment/revocation history.

## Invitation references and responsibility

Every ordinary invitation establishes a persistent reference from the admitted member to the person who invited them. James inviting Peter and Jena records both links; Jena inviting Annet records Annet → Jena → James. These references survive later changes in role, Sequence, or operational authority. Sharing an invitation does not transfer the inviter's account or governance powers.

The Fool or a council member directly appoints moderators without a vote; moderators can invite members, and members can invite other members. The Fool issues council cards, but the founder specifies that the Fool is not the council member's ordinary referral parent: council members are independent roots for their own invitation branches. Governance appointment provenance must still be retained separately from referral-parent links.

For a compromised or panicking ordinary member, the alert goes to moderators and the immediate inviter, and the council is also informed. Moderators lead and can handle the case without requiring the Fool or council to intervene. The Fool and council may follow up. The inviter is a reference contact, not the incident authority: if Annet needs help, Jena is the immediate reference; if Jena is unavailable, moderators can reach James next.

Professional compromise cases are led by the council rather than ordinary-member moderator handling. Alert recipients for professionals beyond the council, and handling of people with overlapping roles, still need specification.

These workflows require explicitly authorised, encrypted alerts and controlled access to referral information, not publishing the invitation tree or giving an inviter access to conversations. Exact escalation timing, acknowledgement rules, and treatment of a compromised or abusive inviter remain unresolved. This updates the earlier duress description that only addressed an inviter and country council.

| Compromised person | Confirmed awareness and references | Responsible for handling |
|---|---|---|
| Ordinary member | Moderators and immediate inviter receive the alert; council is informed; earlier inviter references support escalation when needed | Moderators; Fool and council may follow up but need not intervene |
| Professional | Council; additional recipients are not yet specified | Council |
| Council member | Remaining council members are alerted | Active Sequence 0 authority coordinates the governance response |
| Fool | Council is alerted, including notification of the acting Sequence 0 holder | Acting Sequence 0 under the emergency succession rules |

## Emergency Sequence 0 succession

Founder clarification: Sequence 0 is the active governing authority and can temporarily be held by a council member during the Fool's compromise. It is not permission to reissue the Fool's permanent card or take over their handle. For example, Lady Justice retains her own handle, tarot identity, and invitation branch while acting at Sequence 0; the other council members are alerted to the change. The Fool establishes the council's successor order in advance. Eligibility and unavailability handling within that order remain to be specified.

An explicit compromise alert or entry of the Fool's decoy passcode initiates the emergency process. A council member temporarily takes Sequence 0 according to the configured successor order and handles the Fool's responsibilities. Mere disconnection or inactivity is not a confirmed takeover trigger. Compromise of a council member alerts the remaining council; the active Sequence 0 authority handles replacement or temporary responsibilities. Temporary cover must be distinguished from a formal revocation that returns a council card to rotation.

On the Fool's safe return, the first two council members in the successor order are informed. Restoration requires approval by at least three council members as well as the 24-hour wait; time passing alone does not restore authority. Council members are notified of the resulting authority change. When restoration completes, the acting council member returns to Sequence 1 and their ordinary council responsibilities. A returning compromised council member also waits 24 hours before restoration; whether the same three-approval rule applies to council returns is not yet specified.

This is confirmed product intent, not an implemented emergency protocol. Authorisation of transitions and successor-order changes, safe-return verification, cancellation during the waiting period, revocation freshness, and conflicting claims during network partitions require an explicit design. Fewer than three available eligible councillors does not authorise bypassing the restoration approval requirement. A decoy-triggered process must also preserve the existing requirement that the decoy screen does not reveal the alert. Clients must not automatically accept an unsigned or conflicting claim of Sequence 0.

## Cards: council seats

Each council card has one authorised holder at a time. Formal revocation may return it to rotation; temporary acting duties do not change its assignment. The Fool card is the exception and can never be reassigned. Active council holders together are the council; former holders retain no powers from old assignment records.

| Card | Area |
|---|---|
| **The Fool (0)** | Owner. Only the founder holds it. |
| Wheel of Fortune | Donors and patrons. One seat, plus a badge for top donors. |
| Justice | Legal: lawyers, lawyer verification, wills |
| The Sun | Health: HRT, hospitals, pharmacies, doctor verification |
| The World | Worldwide: travel, cross-border help, surgery planning |
| The Hermit | Knowledge: skills, learning, resources |
| The Magician | Technology and security |
| The Moon | Mental health: therapy, counselling |
| Judgment | Appeals and disputes |
| The Star | Newcomers and community |

More cards can be added as Tero grows, subject to an explicit deck policy. Council reassignment must follow an authorised revocation and preserve the history; it must never create two valid concurrent holders.

### Council rules

- Democratic council revocation votes must take place during a live council audio call, with all council members alerted. The founder specifies a **24-hour voting window**: unanimity is not required. More revoke votes than retain votes means revocation wins; more retain votes means retention wins, subject to the existing Fool veto. A tie or no votes means **no revocation**, and the restrictions imposed by that case are lifted when it closes. Any minimum participation requirement and abstention handling remain unspecified. The three approvals for restoring the Fool are a separate requirement, not the revocation threshold. Whether the call must remain open for the entire window or ballots can be cast in reconvened council calls remains unresolved.
- Anyone with a conflict of interest **steps out** of that vote.
- Every council action goes into an **append-only log**.
- **New council members:** the Fool can add one alone. Other council
  members can only add someone by council vote.
- **The Fool can veto** any council vote.
- **Removing a council member:** the Fool can do it alone. Otherwise it takes a council vote.

### Restrictions during a council revocation vote

As soon as a valid revocation vote opens, the targeted councillor's account enters a restricted, predominantly read-only state. This restriction is immediate at the authority transition, not deferred until the vote closes or the person next joins a call. It remains while the case is unresolved, including if resolution takes longer than expected.

The confirmed exceptions are listening and speaking in the council audio call, and commenting within council discussions. The target cannot otherwise act, publish, comment elsewhere, or exercise governing powers. Whether a target can cast a ballot on their own case is not yet specified. Council discussion access must not be interpreted as a general write permission. A pending vote does not yet return the person's card to rotation.

Clients and nodes must validate the restriction before accepting new actions, not merely hide interface controls. The system needs a definition of who may open a valid case, protection against forged or duplicate proposals, treatment of outstanding sessions and previously queued actions, and an offline freshness policy. Disconnected nodes cannot know of a new restriction instantly; the implementation must state that limitation rather than promise immediate global enforcement during a partition.

At case closure, a tie or no votes results in no revocation and removal of the restrictions imposed by that case. Unrelated restrictions must not be cleared as a side effect. The detailed finalisation rules for a retain majority, withdrawal/cancellation, veto, and failure to finalize still require specification. If revocation succeeds, the resulting authority and card-assignment changes require independently verifiable records. This workflow is not implemented.

## Sequences: trust levels

| Sequence | Who |
|---|---|
| **0** | The Fool normally; one council member temporarily during confirmed emergency succession |
| **1 – 3** | Long-standing, highly trusted members |
| **4 – 6** | Established members |
| **7 – 8** | Active members |
| **9** | New members, just vouched in |

- **Advancing ("digesting")**: you move up by acting your role, meaning real
  contributions such as vouching, confirmed handovers, helpful posts and
  good reviews from verified members.
- Earlier trust proposals weighted community contributions by Sequence. They do not establish weighted council ballots: the latest requirement specifies democratic council votes, with the precise voting rule still unresolved.
- Trust **fades slowly** when someone is inactive.
- **Losing control**: abuse, scams or betraying members drops trust,
  freezes or bans the account. The person who invited them also loses trust.
- Sensitive areas unlock at set Sequences.

## Verifying professionals

Professional status is an additional credential on an existing member account, not a separate admission route or governance rank. Any admitted member may request it without a special invitation or Sequence threshold. The member keeps their handle, tarot identity, and invitation references.

1. The member selects a supported category and the relevant country: doctor, therapist, lawyer, hospital, or another required category. The exact category list and the distinction between a person's qualification and authority to represent an organisation still need specification.
2. A **one-time verification process specific to the category** establishes that the applicant is who they claim and has the relevant credentials or authority. Methods may include a professional register check or other appropriate evidence; no single evidence method is yet selected. Evidence must be encrypted for authorised reviewers.
3. **AI assistance**, if used, can help reviewers examine evidence or registries but does not decide approval.
4. The **council votes** on approval. The **Fool may instead approve directly**, without waiting for or requiring the vote. Direct approval closes the pending vote for that application; later ballots must not reopen or overwrite the completed decision. Concurrent and offline decisions require a verifiable finalisation rule. Council voting thresholds still need specification.
5. Approval grants a **distinct category-specific verified badge**, places the member in the corresponding professional category, and allows professional information, counselling, or services within that verified scope. A badge does not confer moderation or governance powers. Expiry, renewal, suspension, and revocation rules still need specification.
6. Under the existing evidence-minimisation policy, **submitted verification documents are deleted after the decision**. Retain a minimal verifiable credential and decision record: category, jurisdiction, outcome, deciding authority, and date. Retention of particular evidence references and the exact deletion policy require specification; deletion must cover fallback copies and replicas, not only a central database.

Professional compromise cases remain council-led. This application flow and its badge permissions are documented requirements, not implemented functionality.

## Tero cards (invites)

Members invite people by handing them a **Tero card**.

1. The member creates a card. It shows a QR code for `tero.pherus.org/c/<random token>`.
2. The landing page looks neutral and reveals nothing about Tero's members.
3. The **first person to scan** claims it. Nobody else can use it after that.
4. The inviter and the new person confirm a **short code in person**, so a
   screenshot of the QR is useless on its own.
5. Both secretly pick a **bond card** together, which is used later for
   account recovery (see [architecture.md](architecture.md#recovering-after-a-duress-alert-or-false-alarm)).
   The newcomer also secretly picks **their own card**.
6. The inviter **approves**. The token is destroyed permanently. Unclaimed
   cards expire after a set number of days.

**Card types** decide where the newcomer lands:

| Card type | Who can issue it | Lands as |
|---|---|---|
| Member card | Members (count depends on Sequence) | Sequence 9 member |
| Professional card (earlier proposal) | Not required for professional status | Any admitted member can apply through the verification flow above |
| Council card | The Fool only | Council seat nominee |

**The invite tree is a map of the whole network.** Who-invited-whom is
stored encrypted. The server keeps only trust scores and what it needs for
accountability.
