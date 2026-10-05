# Tero design docs

Tero is a global, invite-only platform where queer people help each other:
community, verified professionals, health and HRT, travel and surgery
planning, legal help and wills, jobs, skills, housing and mutual aid.

These documents record what has been decided **before any code is written**.

| Doc | What it covers |
|---|---|
| [vision.md](vision.md) | What Tero is, the four areas of help, access levels, phases |
| [roles-and-sequences.md](roles-and-sequences.md) | Tarot cards (council), Sequences (trust), invites with Tero cards |
| [architecture.md](architecture.md) | One domain, Expo, Cloudflare, encrypted relay, identity keys, voice |
| [threat-model.md](threat-model.md) | Who might attack Tero and how we defend |
| [wallet.md](wallet.md) | Non-custodial stablecoin donations |
| [countries.md](countries.md) | Per-country data: risk, warnings, resources |
| [app-stores.md](app-stores.md) | App Store and Google Play rules, app size |
| [design.md](design.md) | Tero's own design, Apple 2026 style (Liquid Glass) |
| [build-plan.md](build-plan.md) | How phase 1 gets built: layout, technology, milestones |

## Decisions log

| # | Decision |
|---|---|
| D1 | Name is **Tero**, inspired by the Tarot Club in *Lord of the Mysteries*. |
| D2 | Global and borderless. Not hosted in, or operated from, hostile countries. |
| D3 | Run by a Pherus subsidiary in a safe country. Pherus is the parent. |
| D4 | One domain only: `tero.pherus.org`. No subdomains. |
| D5 | One Expo codebase for web, iOS and Android. Admin is behind sign-in on the same domain. |
| D6 | ~~Sign-in through PassID.~~ Replaced by D24. |
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
| D18 | ~~PassID registration.~~ Not needed after D24. `tero.pherus.org` is still in development. |
| D19 | The app locks when it's closed, or after 30 minutes in the background (changed 2026-10-06 at the founder's request; it used to lock on every switch away). A decoy passcode on the same screen opens only basic info and silently sends a duress alert. No disguised icon. |
| D20 | Private chats clear by default and are kept only if both agree. Screenshot alerts warn but don't block. |
| D21 | Spaces (live audio rooms) and anonymous "someone to talk to" are part of Support and care. |
| D22 | The council oversees moderators and countries. Moderators moderate the platform. The Fool can remove a council member alone; otherwise it takes a vote. |
| D23 | Tor is built into the iOS app when added. |
| D24 | **No PassID.** Each person's account is a set of keys they hold, like a crypto wallet. One seed, separate unlinkable keys for identity, messaging, wallet and other apps. |
| D25 | Duress alerts go to whoever brought the person in and the country's council. Recovery uses a one-time passcode from that same person or group, after a waiting period. |
| D26 | Voice: end-to-end encrypted Spaces with up to 6 speakers and unlimited listeners, private voice calls with professionals, and voice disguise. |
| D27 | Recovery phrase is **12 words** (plus social recovery). |
| D28 | ~~Discord-style communities.~~ Replaced by D34. |
| D29 | Recovery: pick your own card and the bond card from a shuffled deck, confirmation outside the app, then a 24-hour wait. |
| D30 | Strict protections are on by default only in high-risk countries or regions (including some US states), set by the country pack. Anyone can turn them on. |
| D31 | Danger signals in Spaces: a secret danger reaction and a personal safe word. Trusted people in the room are told, the person is dropped, and the app slowly switches to basic mode. |
| D32 | Live subtitles with translation in Spaces, done on phones so they stay end-to-end encrypted. |
| D33 | ~~Discord structure with Apple look.~~ Replaced by D34. |
| D34 | **Tero's own design**, made the way Apple designs in 2026 (Liquid Glass, content first). Five tabs: Gathering, Circles, Messages, Help (was Suits, see D41), You. Circles are one conversation with topics and live Spaces. |
| D35 | Colours: warm ivory, slate text, clay accent. Fonts: Newsreader (serif headings) and Instrument Sans. Calm and grown-up, not playful. |
| D36 | **Tero partners.** Clinics, pharmacies and lawyers can become verified Tero partners. Members show their Tero card (three words that change every 30 seconds) and partners show the same words back. Places that don't know Tero are marked "Not aware of Tero": members are told not to show their card there, and the listing shows what members found (availability, price ranges). |
| D37 | Posting has types: Post, Ask for help, Offer help, Event, Fundraiser and Poll, each with its own fields. Photos are blurred and stripped of location before upload. |
| D38 | The "Tero" word is set in JetBrains Mono beside a small tarot-card mark. Final logo to be picked from the logo concepts. |
| D39 | **Chats use OpenMLS** (the MLS standard) for 1-to-1, groups, Circles and Spaces: the official crate with our own thin binding, no third-party wrappers. See [messaging-choice.md](messaging-choice.md). Built after the other work. |
| D40 | **The web is for the Fool and the council**, plus the public site. Members and moderators use the phone app. The Fool sets up on the web and seats council members with council cards (they join at Sequence 1, each with a card no other council member holds). |
| D41 | **No tarot suits for help.** Cups, Pentacles, Swords and Wands are gone (founder, 2026-10-06). The tab is **Help**, with four plain areas: Support and care, Work and money, Safety and law, Health and growth. Tarot stays only for member cards and Sequences. Parts are built as real features, one by one, instead of placeholders. |
| D42 | **The directory is real** (first feature built after D41). Members add places to the seven directory parts (mental health, safe spaces, legal, travel, providers, affirming care, general health): name, country, city, what they offer, contact, cost, "sees people from abroad" and "not aware of Tero". Members vouch once per place ("I've been, it went well"), never for their own. The author, the Fool or the council can remove a place. Who added or vouched is stored only as a keyed pseudonym (HMAC with `AUTH_SECRET`), never the member's key; rotating `AUTH_SECRET` forgets which places are "yours". Ten new places per member per day. "Tero partner" (verified) is set by the council only, later. |
| D43 | **Mutual aid is real.** Members post a request or an offer (rent and housing, food, travel, health and medicine, work, other) with a title, details, country and city; posts show no name. Replies are short notes seen only by the person who posted, one per member per post; until private chats exist, the note is how two people reach each other, and the form warns not to share more than needed. The author marks a post done; posts and their replies are deleted after 30 days. Three posts per member per day. The author, the Fool or the council can remove a post. |
| D44 | **Jobs are real.** Members share openings (job, freelance, internship, mentoring) with a role, optional organisation, details, remote or a country and city, optional pay, and how to apply. Openings show no name, come down after 60 days, five per member per day; the poster, the Fool or the council can remove one. Search and filters (remote only, kind of work) run on the phone. |
| D45 | **Stories are real.** Members share firsthand experiences under a topic (coming out, transition, health, family, work, moving somewhere safer, other), with an optional content note that keeps the story folded until the reader opens it, and an optional country. Stories show no name and only the month they were shared; the form asks people to leave out identifying details. Members can say "thank you for sharing" once per story, never on their own. Two stories per member per day; the teller, the Fool or the council can remove one. Stories don't expire. |
| D46 | **Skills and learning are real.** Members post "I can teach", "I want to learn" or a resource (a free course or workshop, which needs an http(s) link), under a topic (tech, design and art, languages, business and money, trades and crafts, wellbeing, other), online or in a country. Replies to teach and learn posts go only to the poster, as with mutual aid; resources take no replies. Three posts per member per day; the poster, the Fool or the council can remove one. The open guides stay linked at the top. |
| D47 | **Journeys are real and private.** A member's plans (from a template: start gender-affirming care, change name or gender marker, move somewhere safer, plan a surgery; or their own) are sealed on the phone with a key from the 12 words (XChaCha20-Poly1305, padded to 1 KiB). The server keeps one sealed box per member under a pseudonym and can't read it; versions stop two devices overwriting each other. Restoring with the 12 words brings them back. |
| D48 | **Face ID / fingerprint unlock, opt in, phones only** (founder, 2026-10-06). Turned on with one switch in You (no Tero passcode; the phone confirms the owner). The seed is kept in the Keychain/Keystore on this device only while the phone has a passcode; unlocking asks the phone to confirm the owner (Face ID or fingerprint, with the phone's own passcode as the usual fallback) and skips the slow passcode stretching. Changed 2026-10-06 after the first version, which bound the key to biometrics only, failed on the founder's iPhone in Expo Go. It always opens the full Tero (never the decoy view), and the settings screen warns that someone can force a face or finger. It turns itself off when the phone's passcode is removed, and when a vault is set up or restored. Not on the web. |
| D49 | **Help is cards, with one place to create** (founder, 2026-10-06). One "Share or ask" button opens every way to post (ask for help, offer help, suggest a place, share a job, share a story, teach or learn, start a journey) and goes straight to that form. Every part is a card (crisis and map first), and the seven place directories are one row of chips under "Places members trust". The four areas are no longer shown in the app. |
| D50 | **Tero is a queer resource platform, not a game** (founder, 2026-10-06). Line: "Queer knowledge, resources, community, & support": a global, community-driven knowledge and resource platform by Pherus for the LGBTQIA+ community, queer to queer, kept trustworthy by community submission and moderation. The tarot club is an idea behind it, not a theme to show off. The public site is plain and light (one ground, dark text, the warm accent only for links; no dark bands, no gold cards, no novel quotes). **The Fool is not advertised**: no Fool card on the public site or in the web console, no card name in the console greeting. Languages are a dropdown on the web and a list on phones, so more can be added. |

## Open questions

1. Final logo: pick one of the four logo concepts.
2. Tarot card design for the You screen, to match the reference image.
