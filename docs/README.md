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

## Open questions

1. Which blockchain(s) for stablecoins (e.g. USDT on Tron, USDC on Base or Solana)?
2. New council members: does the Fool confirm each one, or does the council vote and the Fool hold a veto?
3. Code license once public (MIT is in the repo now; GPL-3.0 or the Pherus license are options).
4. Minimum age: 18+ is proposed.
5. Can PassID issue pairwise (per-app) subject IDs? See [architecture.md](architecture.md#passid).
