# Tero tarot design structure

First batch: **10 Major Arcana, 0 through IX**. The other 12 Major Arcana and all
56 Minor Arcana remain undesigned. This is presentation work; card assignment,
membership, permanent titles and permissions do not change.

## Visual direction

The founder's references establish cream paper, berry red illustrations, fine
double borders, decorated corners and a tall, restrained card silhouette:

- [Moon reference](https://i.pinimg.com/736x/0d/cf/03/0dcf035c630e436b7d70c7294863ed5f.jpg)
- [Fool reference](https://i.pinimg.com/736x/42/75/23/42752370ca1794fab17659cc0aa0340a.jpg)
- [Additional Moon reference](https://i.pinimg.com/736x/25/c8/32/25c832da096de7d01e5dd677e0a33dff.jpg)

These photographs were inspected in the browser. Their perspective prevents an
exact physical measurement. Tero uses a chosen **height = width × 1.70**. The
reference photographs themselves must not be used as card assets or traced.
Tero's illustrations are original SVG paths, inspired by this visual direction.

## Shared structure

| Element                    | Rule                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| Face                       | Dark charcoal, `#1F1E1D`                                           |
| Main illustration and text | Light gold, `#E6C9A8`                                              |
| Fine frame and ornaments   | Gold, `#C9A27E`                                                    |
| Shared back                | Dark charcoal, `#1F1E1D`, with gold star geometry                  |
| Proportion                 | 1 : 1.70, independent of screen size                               |
| Frame                      | Double line, four mirrored corner ornaments, side diamonds         |
| Number                     | Top centre, 0 for the Fool, Roman numerals for the others          |
| Artwork                    | Centred original line illustration; generous paper around it       |
| Title                      | Bottom centre, Cinzel, restrained capitals and letter spacing      |
| Sequence                   | Small secondary line below the permanent title, when applicable    |
| Avatar                     | Same card illustration simplified through crop and heavier strokes |

The frame, palette, proportions and layout stay shared. The central illustration
changes for each card. There is **one common back**, never a role-specific back.
Handles and display names do not replace the permanent card title on its face.

## First ten illustrations

| Number | Card               | Distinct visual motif                                              |
| ------ | ------------------ | ------------------------------------------------------------------ |
| 0      | The Fool           | Veiled eye, star and an open arc, suggesting concealed possibility |
| I      | The Magician       | Wand and infinity loop                                             |
| II     | The High Priestess | Crescent, veil and twin pillars                                    |
| III    | The Empress        | Crown and Venus sign                                               |
| IV     | The Emperor        | Throne, crown and upright ceremonial sword                         |
| V      | The Hierophant     | Crossed keys and a three-tier cross                                |
| VI     | The Lovers         | Intertwined hearts and a shared ribbon                             |
| VII    | The Chariot        | Canopy, carriage and twin wheels                                   |
| VIII   | Strength           | Lion's mane, calm gaze and infinity                                |
| IX     | The Hermit         | Lantern and walking staff                                          |

These are first-pass symbols, not a finished illustrated deck. Cards outside
this batch use a neutral ornament rather than incorrectly borrowing the Sun.

## Code map and extension rules

- `packages/ui/src/tokens.ts`: the `tarot` palette and aspect ratio.
- `apps/app/src/components/ArcanaArt.tsx`: illustrations indexed by the existing
  Major Arcana numbers. Add the next illustration at its exact existing index.
- `TarotFrame.tsx`: the one mirrored frame used by fronts and back.
- `MemberCard.tsx`: face layout, title, number and Sequence.
- `CardBack.tsx`: shared back for every member card.
- `CardAvatar.tsx`: card-specific avatar used in Yoru, Circles, Messages and chat.
- `my-card.tsx`: face/back flip; both sides use the same aspect ratio.
- `card-designs.tsx`: development gallery for reviewing this first batch without
  assigning cards or changing anyone's account.

Keep SVG paths in a 100 × 140 artwork coordinate system. Use rounded joins,
no heavy filled silhouettes, and 1.1-unit strokes on full cards. Compact avatars
use a tighter crop and 2.5-unit strokes to remain readable. Check one full card
and one 32-point avatar when adding a design. Keep ornaments quieter than the
main motif, and do not add individual background colours or change the frame.

The invitation QR card remains its existing functional layout for now. Do not
restyle QR codes or reduce their scan contrast as part of illustration changes.

## Founder refinement

Use symbols rather than elaborate figurative illustrations. The first rough
line drawings were rejected as insufficiently refined. The current direction
uses cleaner geometric curves, fewer details, balanced strokes and consistent
negative space. The frame uses restrained mirrored corner arcs and small side
diamonds. The common back is soft blush pink, inspired by the iPhone 15 pink
colour impression; `#EFD6DC` is Tero's chosen colour, not a claimed Apple hex code.
This replaces the earlier saturated berry back. Keep this first batch open to
visual refinement rather than treating it as a finished deck.

## Current palette, latest founder correction

Restore the original dark charcoal and gold tone. This supersedes the cream and
berry faces and the proposed blush-pink back above. Keep the distinct symbols,
refined shared frame and 1 : 1.70 proportions. Both faces and the one common back
now use the dark palette in the shared `tarot` tokens. The reference photographs
still inform proportions and restraint, not the current colour scheme.

## Symbol meaning and novel inspiration

The founder names Lord of Mysteries and anime/books as the creative inspiration.
The direction is ceremonial, celestial and quietly mysterious. These are
original Tero motifs, not official insignia from that novel or its adaptations.
The Fool uses a veiled eye rather than the earlier flower, and The Emperor uses
a throne and crown rather than ram horns. The other cards retain recognisable
Tarot anchors: wand/infinity, crescent/pillars, crown/Venus, ceremonial keys,
joined hearts, chariot/wheels, lion/infinity and lantern/staff.

Keep the card name, assigned Arcana number and illustration index together. Do
not rename cards to fit an unrelated drawing. The current assignments remain
0 Fool, I Magician, II High Priestess, III Empress, IV Emperor, V Hierophant, VI
Lovers, VII Chariot, VIII Strength and IX Hermit. New art should be reviewed
against this meaning table before being added to the deck.

The refined frame has a 0.65-unit outer line, a quieter 0.35-unit inner line,
mirrored corner arcs and small lozenges, and oval seals at the side midpoints.
Both sides use the same component; no per-card border variants.
