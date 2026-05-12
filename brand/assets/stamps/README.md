# GVP Circular and Square Stamps

Generated 2026-05-12 for use on Indonesian business documents (contracts,
invoices, official correspondence, internal memos, letterheads).

## Variants

Six SVGs covering two shapes and three colour states.

### Circular (conventional Indonesian cap/stempel)

- `stamp-circular-gold.svg`: on-brand variant, gold.
- `stamp-circular-navy.svg`: formal documents, navy.
- `stamp-circular-black.svg`: maximum formality, black, photocopy-safe.

Construction: 600 x 600 viewBox. Three concentric circles (outer thick, two
inner thin). Top arc text "GRAND VISION PERSPECTIVE" curving over the top in
Fraunces 600. Two decorative dots at 9 and 3 o'clock. Vantage mark centred.
Below the mark: "BALI . INDONESIA" in Manrope caps, then "Est. 2023" in
italic Fraunces.

### Square (corporate seal / letterhead stamp)

- `stamp-square-gold.svg`
- `stamp-square-navy.svg`
- `stamp-square-black.svg`

Construction: 600 x 600 viewBox. Outer thick square (40 px in from edge),
inner thin square (60 px in). Corner accent rectangles in all four corners.
Top: "GRAND VISION PERSPECTIVE" on a horizontal line flanked by short
hairline rules. Centre: Vantage mark, slightly larger than the circular
variant. Below: "BALI . INDONESIA" plus "Est. 2023".

## Preview

Open `stamps-preview.html` in a browser to see all six side by side at preview
scale. Each preview card has a download link to the SVG.

## Production sizes

SVG is vector and scales cleanly. For embedding in Indonesian-standard A4
letterhead, target 4 to 6 cm stamp diameter (circular) or 4 to 6 cm side
(square). The SVGs will render crisp at any size.

For raster output, render the SVG at 1200 x 1200 px or higher via Inkscape,
Illustrator, or headless Chrome. A production rendering script is at
`_scratch/build_stamp_and_fix_email.py` (not yet executed in this session
pending classifier permission; the SVGs themselves are the canonical source).

## Compliance note

GVP is not registered as a PT (perseroan terbatas) in Indonesia. These
stamps are brand identifiers, not formal legal seals. For documents that
require a legal corporate seal, the appropriate Indonesian entity must apply
its own PT stamp. Use this GVP stamp on top of or alongside, never as a
substitute for, legally required seals.

## Picking one

The brand will be cleaner if we lock a single shape rather than mixing.
Tell Skipper which lands (circular or square), and the chosen SVGs get
promoted to canonical status in `docs/brand/02-marks.md` and uploaded to
Drive.
