# Text layout

`TextField.wordWrap = true` uses Unicode 17.0 UAX #14 line-break opportunities
from `@cto.af/linebreak`. Available width determines which opportunity is used.
Font family, size, bold and italic are measured through the same Canvas font
configuration used for rendering. Rich-text style boundaries do not create
additional wrap opportunities.

- Latin and Cyrillic text prefer word boundaries. CJK text observes opening
  and closing punctuation rules rather than treating dictionary words as units.
- Thai, Lao and Khmer add dictionary boundaries through the browser's
  `Intl.Segmenter`. The default Unicode rules remain independently testable.
- Optional word and emergency break opportunities are filtered
  through `Intl.Segmenter` grapheme boundaries. Emoji ZWJ sequences, flags,
  skin-tone modifiers, combining marks and conjuncts stay intact. A grapheme
  wider than the field overflows intact rather than being split.
- When an alphabetic word is wider than the entire line, emergency wrapping
  relaxes UAX #14's alphabetic rule LB28. Non-breaking spaces, narrow
  non-breaking spaces, word joiners and punctuation protection remain in force.
  Protected sequences can therefore exceed the field width.
- Ordinary spaces and tabs at a wrapped line's end are omitted from drawing
  and width measurement. They are consumed on that line, so they never become
  indentation on the next automatic line. Explicit indentation after a hard
  separator is retained. Other space characters keep their Unicode behavior.
- The source string is unchanged. Line `charNum` counts consumed UTF-16 code
  units, including unpainted spaces and both characters of CRLF. Painting,
  input caret and hit testing use these source offsets.
- In multiline mode, CRLF, CR, LF, VT, FF, NEL, line separator and paragraph
  separator force line breaks. A trailing hard separator retains a final empty line.

`wordWrap = false` wraps between grapheme clusters in multiline mode. Explicit `multiline = false` renders only the first
hard-separated line without width wrapping. Dynamic text defaults to multiline;
INPUT defaults to single-line until the flag is assigned. An unconstrained
multiline field measures its hard-separated lines without automatic wrapping.
Fixed height clips drawing rather than changing those measured lines.

Dictionary and grapheme segmentation follow the browser's `Intl` data. The
pinned Unicode 17.0 tables govern the line-break profile; they do not replace
the browser's grapheme implementation.

## Vertical alignment

TextField and BitmapText default to middle. UI text components inherit their
host Core default; explicit top/middle/bottom remains authoritative.

| Setting | Dynamic text placement |
| --- | --- |
| `top` | Align the complete block's top edge to the field's top. |
| `middle` | Align the block's midpoint to the field's midpoint. |
| `bottom` | Align the block's bottom edge to the field's bottom. |

The dynamic block is the union of glyph ink and nominal blank rows, including
leading/trailing blanks. Mixed-size runs, fallback fonts and combining marks
participate. Each mode applies one translation without changing relative
alphabetic baselines or row spacing. `multiline` controls line generation only.
Overflowing dynamic text retains the selected alignment under viewport clipping.
Automatic height uses nominal content height as the available field height.

INPUT aligns stable nominal editing rows for text, caret, selection, composition
and character hits. When those rows exceed the viewport, input stays top-aligned
and scrolling reveals the caret. Glyph changes cannot move its editing frame.
BitmapText aligns its bitmap-font line frame and literal glyph offsets.

Core measurements, wrapping and font-fitting metrics remain nominal. Core
outlines are render-only; UI Label reserves its own outline-safe layout inset.
`verticalCenter` places the whole UI box and does not select text alignment.
Set explicit top for progressively typed dialogue or top-origin paragraphs.

## Baselines and cached metrics

Canvas and WebGL use the same alphabetic baseline and Canvas TextMetrics in
logical units. Rich runs share a line baseline even with different fonts/sizes.
Visible bounds include accents, fallback glyphs and combining marks. Block
translation, painting, link hits and capture margins share cached layout data.
Changing font/content/wrapping/spacing invalidates those metrics. Actual fonts
and browser rasterization may vary across systems.

## Independent measurement

`textField.measureText(width = NaN)` measures complete content under a separate
width constraint. NaN means unconstrained; zero returns no lines in multiline
mode; negative or infinite values throw RangeError. Single-line mode ignores
width wrapping as it does during rendering.

The result excludes height clipping and scrolling. Measurement does not replace
rendered line caches or change width, height, content or dirty flags. It uses the
same run styles and line spacing as rendering. For dynamic rich text, line height
is the largest run size on that line; blank and trailing hard-separated lines
retain the relevant run size. Input fields keep the base size contract. Unstyled blank
runs between styled runs use the base size rather than the later run's size.

Assigning `text`, including the same string represented by a previous `textFlow`,
returns the field to plain-text styling. `measureText` does not load fonts or
cache a separate measurement; UI components may cache results until invalidated.

## Text outlines

Dynamic TextFields have a render-only margin for their effective stroke widths,
including run-level overrides. Canvas clipping, WebGL text rasterization,
display-list caches, filter captures and object-mask buffers retain this ink.
The margin covers stroke antialiasing and glyph overhang; it is not part of
`width`, `height`, `textWidth`, `textHeight`, `measureText()` or hit-test bounds.
Wrapping and horizontal/vertical alignment use the original layout dimensions.

Explicit dimensions still constrain layout and select visible lines. Partially
visible lines clip against the expanded ink area; fully hidden lines are not
painted, including lines immediately before or after a scrolled viewport.
Input fields keep their exact viewport for text, selection and caret drawing.
External `scrollRect` and masks retain their authored boundaries and can clip
outlines intentionally. Zero-size fields remain empty.

## Font readiness

Load fonts before constructing or measuring text where possible. After a font
becomes ready late, call `textField.invalidateTextMetrics()`; reassigning an
unchanged family name does not invalidate cached line measurements. This method
clears text layout and marks the text for rendering with the newly available
font. UI Labels additionally need layout invalidation through their documented
`invalidateSize()` contract. Core does not install a global font-loading listener.

## Segmentation utilities

`WordWrap.tokenize()` is a public word-segmentation utility, not TextField's
line-break algorithm. `splitGraphemes()` returns complete grapheme clusters.
Shared word/grapheme segmenters and per-paragraph UTF-16 end offsets support
ordinary and emergency wrapping; text/segmentation results are not cached globally.

## Verification

Run Core's build and unit tests. LineBreaks checks the pinned Unicode corpus;
TextWrapping/TextGraphemes check dictionary and emergency tailoring, rich runs,
hard separators and source offsets. TextVerticalLayout/TextMeasurement/TextStroke
cover nominal metrics, alignment, input rows, capture ink and font invalidation.
Minified browser suites compare Canvas, WebGL 1 and WebGL 2 rendering, clips,
link/input coordinates and outlines at different output resolutions.
