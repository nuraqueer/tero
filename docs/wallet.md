# Wallet

**Stablecoins only. Non-custodial: users hold their own keys. Tero never
holds or moves anyone's money.**

Why this route:

| Option | Problem |
|---|---|
| Donation links (M-Pesa, MoMo, PayPal) | Goals and totals can't be verified |
| A payment company holds the money | Exposes the person; providers may drop queer platforms; needs licences |
| **Non-custodial stablecoins** | ✅ Chosen |

## How it works

- Wallet keys come from the person's seed (see [architecture.md](architecture.md#identity-your-keys-are-your-account)), separate from their Tero identity key, and stay on the device.
- A fundraiser (a goal) gets its **own new address**.
- Anyone can check the goal's progress on the blockchain. Nobody has to take Tero's word for it.
- Only members can see which address belongs to which Tero fundraiser.

## Risks and how we handle them

| Risk | Handling |
|---|---|
| Donor addresses are public on the blockchain | New address per fundraiser; warn users not to reuse addresses tied to their real name |
| Issuers (Circle, Tether) can freeze addresses | Tell users plainly |
| Cashing out locally | The user's choice of exchange; Tero gives per-country guidance only |
| App store rules | See [app-stores.md](app-stores.md) |

## Chain: Celo

**Decision: Celo, with USDT and USDC.**

| Why | Detail |
|---|---|
| Fees in the stablecoin | Users pay network fees in USDT or USDC. Nobody has to buy a separate coin first, which is the biggest usability problem with crypto wallets. |
| Cheap and fast | Fees are a fraction of a cent, which matters for small donations. |
| Used in Africa | Opera's MiniPay wallet runs on Celo with USDT, so cashing out locally is already familiar to many people. |
| Same code, more chains | Celo works like Ethereum. The same code and keys can add Base, Polygon or Arbitrum later. |
| Small app | Ethereum libraries such as viem are small and only include what's used. |

Rejected for now:
- **Tron**: USDT on Tron is popular, but fees need TRX and it uses different code. It can be added later if members ask for it.
- **Solana**: good, but different code, keys and libraries, which make the app bigger.

The chain is public, like every blockchain. The privacy rules above still apply.
