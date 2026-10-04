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
| **Suits** | Explore by suit: Cups, Pentacles, Swords, Wands (resources, jobs, legal, journeys) |
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

## Fonts

Apple's San Francisco font may only be used on Apple devices.

- **iOS:** the system font (San Francisco).
- **Android and web:** Inter, which looks very similar and is free to use.
- **Chinese:** the system's Chinese font on each platform.
