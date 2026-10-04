# Roles, cards, Sequences and invites

There are four separate kinds of people. A person can be more than one,
but the powers never mix.

| Role | What they do | What they can't do |
|---|---|---|
| **Card holders (council / admins)** | Govern, verify professionals, vote | Moderate content day to day; read private messages |
| **Moderators** | Handle reports and content | Vote, verify, change roles |
| **Professionals** | Offer services with a verified badge | Moderate or govern because of the badge |
| **Members** | Everything else, by Sequence | — |

The card is what people **see**. Permissions are stored as a separate
role underneath, so cards can be renamed or reordered without touching
security.

## Cards: council seats

Like the Tarot Club, each Major Arcana card has **one holder**. The card
holders together are the council.

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

More cards can be added as Tero grows.

### Council rules

- Votes need a **quorum** (proposed: more than half of the seats).
- Anyone with a conflict of interest **steps out** of that vote.
- Every council action goes into an **append-only log**.
- New council members: *open question*. Either the Fool confirms each one,
  or the council votes and the Fool holds a veto.

## Sequences: trust levels

| Sequence | Who |
|---|---|
| **0** | The Fool only |
| **1 – 3** | Long-standing, highly trusted members |
| **4 – 6** | Established members |
| **7 – 8** | Active members |
| **9** | New members, just vouched in |

- **Advancing ("digesting")**: you move up by acting your role, meaning real
  contributions such as vouching, confirmed handovers, helpful posts and
  good reviews from verified members.
- Votes from higher Sequences count more. One-off accounts can't push trust.
- Trust **fades slowly** when someone is inactive.
- **Losing control**: abuse, scams or betraying members drops trust,
  freezes or bans the account. The person who invited them also loses trust.
- Sensitive areas unlock at set Sequences.

## Verifying professionals

1. The person applies for a profession in a country (doctor, lawyer, therapist and so on).
2. A **flow specific to that profession** runs: for example, a medical register lookup or a bar list check.
3. **AI assists** by reading documents and checking registries, then suggests a result. It never decides.
4. The relevant **card holders vote** (for example The Sun for doctors, Justice for lawyers).
5. **The documents are deleted** after the decision. Only the outcome, who decided and the date are kept.

## Tero cards (invites)

Members invite people by handing them a **Tero card**.

1. The member creates a card. It shows a QR code for `tero.pherus.org/c/<random token>`.
2. The landing page looks neutral and reveals nothing about Tero's members.
3. The **first person to scan** claims it. Nobody else can use it after that.
4. The inviter and the new person confirm a **short code in person**, so a
   screenshot of the QR is useless on its own.
5. The inviter **approves**. The token is destroyed permanently. Unclaimed
   cards expire after a set number of days.

**Card types** decide where the newcomer lands:

| Card type | Who can issue it | Lands as |
|---|---|---|
| Member card | Members (count depends on Sequence) | Sequence 9 member |
| Professional card | Members at a set Sequence | Member, with verification started |
| Council card | The Fool only | Council seat nominee |

**The invite tree is a map of the whole network.** Who-invited-whom is
stored encrypted. The server keeps only trust scores and what it needs for
accountability.
