# App stores and app size

Tero ships on the App Store and Google Play, so their rules shape the
design from day one. Re-check every rule against the current guidelines
before submitting.

## Rules that affect Tero

| Area | Rule | What Tero does |
|---|---|---|
| User content (Apple 1.2) | Apps with user content need filtering, reporting, blocking and published contact details | Moderators, report and block everywhere, support contact |
| "Someone to talk to" (Apple 1.2) | Chatroulette-style random anonymous chat is rejected | Presented as anonymous peer support for emotional relief. Random matching, but only between vouched members, with reporting and moderation. Text first, never video. |
| Hidden features (Apple 2.3.1) | Undocumented or hidden features are rejected | The decoy passcode and duress alert are explained in the review notes as safety features, with a demo account |
| Downloaded code (Apple 2.5.2) | Apps can't download new native code | Tor and other native parts must ship inside the iOS app. JavaScript updates (EAS Update) are fine if the app's purpose doesn't change. |
| Crypto wallets (Apple 3.1.5) | Wallets must come from a developer enrolled as an organisation | Publish under Pherus (or the subsidiary) as an organisation |
| Gifts between people (Apple 3.1.1) | Person-to-person gifts can skip in-app purchase if optional and 100% goes to the receiver | Tero takes no cut of donations |
| Crypto (Google Play) | Some countries have extra rules for crypto wallets | Check Google's current wallet policy for each country before launch |
| Account deletion (Apple 5.1.1) | Users must be able to delete their account in the app | Delete account in settings: removes Tero's server data and wipes the keys and data on the phone |
| Sign in with Apple (Apple 4.8) | Required if third-party logins are offered | Tero has no third-party login (accounts are keys), so it doesn't apply |
| Age rating | Mature content and unrestricted chat | 18+ rating on both stores |
| Government removals | Stores remove apps per country on government request | PWA and direct Android download as fallbacks |

## App size

Data is expensive in many of Tero's countries, so small matters.

- **Target: under 50 MB to install** for phase 1. Apple's download limit
  over mobile data is 200 MB, and Google Play's base download is 200 MB.
- **Don't ship content in the app.** Country packs, resources and
  translations beyond the device's language are downloaded as signed
  bundles when needed.
- **JavaScript updates over the air** (EAS Update) so small fixes don't need a full download.
- **Watch the heavy parts:**

| Part | Size impact | Plan |
|---|---|---|
| Encryption (Signal protocol / MLS) | A few MB | Needed from day one |
| Wallet (viem, Celo) | Small | Only include what's used |
| Tor (Arti) | Large, per phone architecture | Later. On Android, a separate download module. On iOS, it must be inside the app. |
| Bluetooth mesh | Medium | Later research |
| Images and fonts | Varies | Compressed, with fonts limited to the scripts needed (Latin and Chinese) |
