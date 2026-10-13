# Design

**Tero's own design, made the way Apple designs in 2026: calm, glassy,
content first.** Not Discord, not a copy of any app.

Founder direction, 2026-10-13: this is Pherus Hino UI. Use Apple's care with motion and materials as inspiration, with our own visual language. Gathering, Circles, Messages, and Help share one capsule; You is a separate round control. iOS 26 must retain Apple's actual Liquid Glass, using `GlassView` for this custom layout, plus SF Symbols. Android uses efficient backdrop blur and corresponding SVG icon shapes. Android controls are 48 points high and have slightly more clearance above system navigation; iOS controls are 52 points high and sit 15 points from the bottom edge. Reduced motion and transparency settings are respected. The main capsule now follows the Notables interaction on both phones: scrolling into content minimizes it to the current icon, scrolling back or tapping reveals all four tabs, and the separate You control stays fixed. The scroll threshold and smooth spring follow Notables; native iOS Liquid Glass is preserved. Near the top or after changing tabs the capsule is expanded. The physical Android check confirms collapse to the selected icon, reverse scroll to expand, and tap to expand, with You fixed. The latest iPhone material and placement still need a device visual check.

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
| **iOS 26 and later** | Native Liquid Glass surfaces and SF Symbols within Hino's split navigation layout |
| **Older iOS** | Native backdrop blur plus tint within the same layout |
| **Android 12 and later** | Hino capsule using efficient Android blur over an explicit content target |
| **Older Android** | Translucent tint without expensive software blur |
| **Web** | Hino capsule with the available browser backdrop effect |

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

Member discovery, 2026-10-13: You has a profile panel separate from the Tarot card. A new handle requires confirmation and is fixed after saving; display names stay editable. Circles starts with Network, Contacts and Following controls, member search and real member cards, then the existing circles empty state. Requests have incoming, outgoing and accepted states, with explicit acceptance and removal. Following remains an empty future surface until verified professional appointments exist. The physical Android renders both actual test identities. Both devices still need user chosen profiles and a completed acceptance check.

Contacts refinement, 2026-10-13: Circles uses compact name ordered rows, alphabet headers and inset separators instead of separate member cards. Network pins your own profile first, including when your identity is outside the loaded page, and tapping it opens You. Contacts excludes your own identity. The trailing plus sends or accepts a request, a clock shows an outgoing request, and a check shows an accepted contact. Search uses a soft rounded field and Network, Contacts and Following use a compact segmented selector. Refresh is a pull gesture. Handles accept hyphens, including @la-niina, and the profile editor shows La niina as the display name example. A debounced authenticated check reports handle availability using the keyed handle identifier; saving remains the authoritative uniqueness check.

Density adjustment: Network, Contacts and Following have a 34 point visible segment with extra touch allowance. Member avatars are 32 points and rows have 9 points of vertical padding. You uses 16 point section spacing without stacked panel margins, a 48 point card avatar, compact profile padding and 46 point settings rows that can grow for wrapped text.

You identity row: a 40 point avatar, 20 point title and smaller subtitle. After profile claim, the display name replaces the Tarot title and @handle replaces Sequence in this row. Tapping still opens the unchanged Tarot card.

Latest density refinement: directory rows show only display name and handle, falling back to card title and shortened address. Sequence is omitted here. Plus circles are 30 points within 44 point touch areas. Circles section gaps are 8 to 12 points, and You section gaps are 12 points. Android Lock is a 36 point icon with touch allowance; the fingerprint glyph uses lighter, balanced contours.

Final Circles selector direction: the introductory sentence is removed. Network, Contacts and Following appear immediately below the title as 32 point underline tabs with 12 point labels and no filled capsule.

Tab labels use zero horizontal padding, intrinsic widths and an 8 point gap (px-0, gap-2), without equal width stretching.

Spaces is the first selector tab, followed by Network, Contacts and Following. It holds the forthcoming live Spaces empty state and the current circles area. An ActiveCircles rail is placed between the page title and selector. It renders only when supplied real live or active sessions; the live session discovery source is not implemented, so the rail is currently hidden.

The personal profile tab and page title are now Yoru on both platforms and in every locale. Existing route and account behavior are retained.

Request visibility correction: compact rows retain a small relationship label (Request sent, Wants to connect, Connected). Contacts shows a pending request count and places requests above accepted contacts. Incoming actions say Accept with a check icon, while cancelling a sent request asks for confirmation. This keeps the compact layout without hiding request state. Android showed the founder profile @la-niina and an actual incoming request from @pherus; the agent did not accept or cancel it.


Current tarot direction (13 October 2026): first ten Major Arcana only, 0–IX.
Original dark charcoal and gold restored at the founder's request. Tall 1:1.70
member cards, shared fine frame on both sides, one common celestial back, and
card-specific symbolic art in profiles and the card face. Lord of Mysteries and
anime/books inform the ceremonial mood. See [tarot-design.md](tarot-design.md)
for current materials, meanings and extension rules. The cream/berry and pink
experiments were superseded; no Minor Arcana is designed or assigned here.
