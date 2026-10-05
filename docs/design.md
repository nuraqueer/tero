# Design

**Tero's own design, made the way Apple designs in 2026: calm, glassy,
content first.** Not Discord, not a copy of any app.

## The idea: above the gray fog

In the novel, the Tarot Club meets above the gray fog. Apple's current
design language, Liquid Glass (since iOS 26), fits this naturally:
navigation and controls float as soft, translucent glass over the content,
like fog. Tero's whole look is built on that one image.

## Principles (how Apple designs now)

| Principle | What it means in Tero |
|---|---|
| **Content first** | Messages, people and posts fill the screen. Controls float above them and step back when you scroll. |
| **Glass only for controls** | Tab bar, toolbars, buttons and sheets are glass. Content (messages, cards, posts) is never glass. |
| **Floating, shrinking navigation** | The tab bar floats above the content and shrinks as you scroll down, then returns. |
| **Rounded and concentric** | Corners are large and nest inside each other evenly (a button inside a card inside a sheet). |
| **Sheets over new screens** | Actions slide up as sheets you can pull to different heights, rather than jumping to new pages. |
| **Few, clear choices** | One main action per screen. Less chrome, more space. |
| **Motion with meaning** | Soft spring animations that show where things come from and go. Reduced when the phone asks for less motion. |
| **Accessible by default** | Dynamic Type, VoiceOver and TalkBack, strong contrast, and a solid (non-glass) look when the phone's "reduce transparency" setting is on. |

## Structure: Tero's own

Five tabs at the bottom:

| Tab | What's there |
|---|---|
| **Gathering** | Your home: posts, live Spaces, news from your Circles |
| **Circles** | Communities (see below) |
| **Messages** | Private chats, iMessage-like, including "someone to talk to" and professionals |
| **Help** | Four plain areas: Support and care, Work and money, Safety and law, Health and growth (D41) |
| **You** | Your card, your Sequence, wallet, safety settings |

### Circles (instead of Discord servers)

- A Circle opens as **one calm conversation**, not a list of channels.
- **Topics** are pills at the top that filter the conversation, so it never
  becomes a maze of channels.
- A **live Space** appears as a glowing glass bar at the top when one is on;
  tap to join, pull up to see speakers.
- Pinned resources and members slide up as a sheet.

### Messages

- iMessage-style bubbles, reactions (tapbacks), typing indicator, swipe to
  reply.
- A small timer on chats that clear automatically; both people agreeing to
  keep a chat is shown clearly.

### Your card

Each person's profile is shown as a **tarot-style card**: pseudonym, Sequence,
badges (verified professional, council seat). Card art is Tero's own, not
from the novel.

## Building it

| Platform | Glass |
|---|---|
| **iOS 26 and later** | Real Liquid Glass through Expo's native tabs and glass components |
| **Older iOS, Android, web** | Tero's own glass: blur plus tint, made to look the same |
| **Low-end Android phones** | Solid tinted surfaces instead of blur, so the app stays fast. Many members use budget phones. |

The tarot theme shows where it means something (cards, invites, recovery,
Sequences, the council). Everyday screens stay clean.

## Colour

Warm, calm and grown-up: a warm ivory ground with one clay accent.

| Role | Colour |
|---|---|
| Background | Ivory `#FAF9F5` |
| Surfaces | White `#FFFFFF`, with hairline borders |
| Text | Slate `#141413` |
| Secondary text | Warm grey `#5E5D59` |
| Accent (live dots, rings, icons) | Clay `#D97757` |
| Accent text and links | Deep clay `#B4532F` (readable on ivory) |
| Main buttons | Slate with ivory text |
| Subtle fills, your chat bubbles | Oat `#E3DACC` |

Restraint over decoration: hairline dividers instead of heavy cards,
small radii, no glows, plain monochrome avatars.

## Fonts

Serif headings over a clean sans for everything else. Both are free and
open, so they can ship on every platform.

| Use | Font |
|---|---|
| Headings and numbers on the lock keypad | **Newsreader** (serif) |
| The word "Tero" | **JetBrains Mono**, beside a small tarot-card mark |
| Tarot card lettering | **Cinzel** |
| Everything else | **Instrument Sans** |
| Chinese | The system's Chinese font on each platform |

The warm feel is inspired by Claude's interface. Anthropic's own fonts are
private and are not used.

## Mockups

Clickable mockups: https://claude.ai/artifact/TpPoDJbAyYFAFGKgxdzqYd

The source of every screen is in [`design/mockups/`](../design/mockups), and
the screenshots used in the README are in [`docs/screens/`](screens).
`design/render.mjs` and `design/compose.mjs` regenerate the screenshots.

| Group | Screens |
|---|---|
| App | Lock, Gathering, Circle, Live Space, Messages, Suits, You, New post |
| Inside Help | Support, Someone to talk to, Resources with Tero partner and not-aware places, Show my Tero card, Opportunities, Journey planner |
| Public website | Home, guide page |
| Running Tero | Council dashboard, moderation dashboard |
| Brand | Logo concepts: Tero inside a tarot card (not chosen yet) |

Each part has its own layout: support is calm and conversational, safety is a
directory, work mixes a showcase with lists, and journeys are a step-by-step
timeline. The mockups still show the old suit names (Cups, Pentacles, Swords,
Wands); the app uses the plain area names (D41).
