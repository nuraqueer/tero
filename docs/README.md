# Tero design docs

Tero is a global, invite-only platform where queer people help each other:
community, verified professionals, health and HRT, travel and surgery
planning, legal help and wills, jobs, skills, housing and mutual aid.

These documents record what has been decided **before any code is written**.

| Doc | What it covers |
|---|---|
| [vision.md](vision.md) | What Tero is, the four suits, access levels, phases |
| [roles-and-sequences.md](roles-and-sequences.md) | Tarot cards (council), Sequences (trust), invites with Tero cards |
| [architecture.md](architecture.md) | One domain, Expo, Cloudflare, encrypted relay, PassID |
| [threat-model.md](threat-model.md) | Who might attack Tero and how we defend |
| [wallet.md](wallet.md) | Non-custodial stablecoin donations |
| [countries.md](countries.md) | Per-country data: risk, warnings, resources |
| [app-stores.md](app-stores.md) | App Store and Google Play rules, app size |

## Decisions log

| # | Decision |
|---|---|
| D1 | Name is **Tero**, inspired by the Tarot Club in *Lord of the Mysteries*. |
| D2 | Global and borderless. Not hosted in, or operated from, hostile countries. |
| D3 | Run by a Pherus subsidiary in a safe country. Pherus is the parent. |
| D4 | One domain only: `tero.pherus.org`. No subdomains. |
| D5 | One Expo codebase for web, iOS and Android. Admin is behind sign-in on the same domain. |
| D6 | Sign-in is passkeys only, through **PassID** (one account). |
| D7 | Sensitive data is encrypted on the device. Cloudflare stores only ciphertext (encrypted relay). |
| D8 | Joining is invite-and-vouch only, with single-use Tero cards. |
| D9 | Money is stablecoins only, non-custodial. Tero never holds funds. |
| D10 | Languages: English, Swahili, Chinese (zh) and French from day one. |
| D11 | Admins (council), moderators, professionals and members are separate roles. |
| D12 | Professional verification is per country and per profession. AI assists, and the council votes. |
| D13 | Wallet chain: **Celo**, with USDT and USDC. Fees paid in the stablecoin itself. Other EVM chains can be added later with the same code. |
| D14 | Council: the Fool can add a council member alone. Other council members can only add someone by vote. The Fool can veto any vote. |
| D15 | Code license: **AGPL-3.0** (in `LICENSE`), with a contributor agreement (`CLA.md`) so Pherus can ship to the app stores. |
| D16 | Minimum age: **18, or the country's legal age if higher**. |
| D17 | App store rules and app size are design constraints from day one. |
| D18 | PassID registration waits until PassID supports pairwise identifiers. `tero.pherus.org` is still in development. |
| D19 | The app locks every time it's closed. A decoy passcode on the same screen opens only basic info and silently sends a duress alert. No disguised icon. |
| D20 | Private chats clear by default and are kept only if both agree. Screenshot alerts warn but don't block. |
| D21 | Spaces (live audio rooms) and anonymous "someone to talk to" are part of Cups. |
| D22 | The council oversees moderators and countries. Moderators moderate the platform. The Fool can remove a council member alone; otherwise it takes a vote. |
| D23 | Tor is built into the iOS app when added. |

## Open questions

1. PassID: pairwise identifiers, and age checks beyond 18 and 21 (see [architecture.md](architecture.md#asked-of-passid)).
2. Duress alert: default emergency contacts, and recovery after a false alarm.
3. Spaces: is audio end-to-end encrypted, and can speakers use voice changing?
