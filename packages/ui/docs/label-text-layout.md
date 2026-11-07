# Label text layout and fitting

`TextFitMode` is `none | shrink`. Native Label owns normal layout, single- and
multiline fitting, outline-safe bounds and derived rendering observations.
KUI compilation and semantic materialization pass the authored policy to that
same native component. UI 5.1.2 requires Core ^3.2.1 for the stable dynamic
font-frame contract below. Core 3.2.2 is recommended for render-only ink
protection and mixed-size row scrolling; it does not raise that peer minimum.

## Outline-safe layout

Nonempty dynamic Labels with a positive finite `stroke` reserve separate
horizontal and vertical insets in logical pixels:

- Top/bottom: `ceil(stroke) + 2`. The font frame already contains the glyph body;
  reserve the outline radius plus rounding and antialiasing space rather than
  doubling the radius on each side.
- Left/right: `ceil(2 * stroke) + 2`, with an additional `ceil(size / 4)` for
  italic text, whose ink can extend beyond its horizontal advance. The size in
  this guard is authored `size`, so fitting cannot move the content origin.

Both insets stay independent of the current string and fitting candidate.
Measurement, wrapping, fitting and painting use the same corresponding axes.
Scroller clips remain exact, with no new setting. For a 24px font whose natural
frame is 29px, a 2px outline adds 4px above and below: automatic height is 37px.

Automatic width includes both horizontal insets. Automatic height contains stable
font-frame rows (including blank rows and line spacing) and both vertical insets.
A row contains its font ascent/descent even when the current string has no accents
or descenders.
Fixed/parent/max dimensions remain the outer box; line generation
and fitting use its inner area. Minimum-size overflow still reports failure
and permits clipping; a box too small for its inset does not become automatic.
Fitting toggles at unchanged drawing size retain identical geometry and pixels.
Unoutlined or empty Labels add no inset; empty-row measurements stay native.
EditableText, RichLabel and BitmapLabel do not adopt Label's outline insets.
RichLabel does use Core's dynamic font-frame rows; EditableText retains nominal
input rows, and BitmapLabel retains the bitmap font's line-height contract.

Keep explicit `verticalAlign="top"` for progressively typed dialogue. The origin
stays fixed after clearing/retyping. Middle and bottom also retain their baseline
when only accents or descenders change, but adding rows shifts their whole block
to maintain the selected alignment. Font readiness still
uses `invalidateSize()`. Outline/state changes invalidate the normal UI layout.

## Lines and bounds

- `Label.multiline` defaults to `true`. Text wraps at a finite available width;
  hard separators also create lines. Automatic height measures all those lines.
- `multiline = false` displays only the first hard-separated line, without
  automatic wrapping. Overflow is clipped by the available bounds. Original
  `text` is retained, including any hidden later lines.
- `wordWrap = true` chooses Unicode line-break opportunities, with the Core
  dictionary and overflow tailoring. `false` chooses character boundaries.
  This property has no effect while `multiline` is false.
- A fixed height limits the visible area. It does not change the line count or
  switch a multiline label into single-line mode.
- `EditableText` defaults to single-line input. Core `TextField` defaults to
  multiline in dynamic mode and single-line in input mode until `multiline` is
  explicitly assigned. An assignment persists across later type changes.
- CRLF, CR, LF, VT, FF, NEL, line separator and paragraph separator are hard
  separators. In single-line mode, only the content before the first is drawn.
  A literal backslash followed by `n` remains literal text in KUI strings.

Explicit `multiline="false"` selects a single line.
Remove it or set it to `true` for text intended to wrap. No files are migrated
automatically; omitted Label flags continue to allow wrapping.

## Vertical alignment and skin defaults

Label, RichLabel and EditableText inherit TextField's default; BitmapLabel
inherits BitmapText's. With Core 3 they default to
`verticalAlign="middle"`. Button
skins in the native KUI kit already set middle explicitly. Button does not
overwrite an authored top/bottom or a skin state. Use explicit top for content
intended to start at the top of a taller box. `verticalCenter` positions the
Label box in its parent; it does not align text inside the Label.

The authoring catalog reports middle without inserting omitted properties.
Dynamic top/middle/bottom align the same stable font-frame block in either line
mode; blank rows retain their height. Input uses stable editing-row boundaries.
Label measurement and textFit use Core's full line-frame height plus the fixed
outline allowance. Fonts with tall metrics can increase automatic height or
require a smaller fitted size in an unchanged fixed box. Glyph-specific ink
bounds protect drawing captures and do not recenter the text.
See [Core text layout](../../core/docs/text-layout.md).

## Shrink to fit

```xml
<Label id="labelDisplay" text="KZT 10 000,00" width="140" size="24"
       multiline="false" textFit="shrink" minFontSize="16" />
```

`textFit` accepts `none` (default) and `shrink`. Shrinking applies to ordinary
Labels in either line mode. `multiline` always chooses line generation; fitting
never changes it based on height or the selected size. EditableText rejects
`shrink`, including through the shared authoring schema. Put the policy
on a Button's `labelDisplay` skin part rather than on the Button itself.

```xml
<Label text="Доказуемая честность" width="120" height="44" size="20"
       wordWrap="true" lineSpacing="2" textFit="shrink" minFontSize="14" />
```

This uses the default multiline mode. At each candidate size, Core lays out
the complete displayed text under the effective content width. Measurement
includes hard breaks, blank/trailing rows and line spacing, independently of
height clipping. If the base size fits across several rows it is retained.
Otherwise fitting searches smaller sizes, recalculating the row breaks each time.
No maximum row count is implied by a fixed height, and no `maxLines` is added.

| Available bounds                    | Multiline shrink behavior                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Both automatic                      | Retain base size; soft wrapping has no width constraint.                                    |
| Width constrained, height automatic | Wrap and measure automatic height; shrink only if a protected sequence still exceeds width. |
| Width automatic, height constrained | Measure hard-separated rows without soft wrapping, then fit their complete height.          |
| Both constrained                    | Wrap and shrink as needed to fit complete width and height.                                 |

- `size` is always the authored/base size. `renderedSize` is the derived drawing
  size after layout validation. State overrides capture and restore `size`.
- Fit starts from that base size on every metric change. Shorter text or a
  larger region restores the base size; text never grows beyond it.
- `minFontSize` defaults to 12 logical pixels, must be finite and at least 1,
  and acts as a lower bound. A minimum above `size` never enlarges the text.
- Measurement uses displayed text, font family, bold/italic settings and the
  outline-safe layout bounds described above. Search, automatic measurement and
  drawing reserve the same inset once. Both alignments operate inside that area;
  symmetric insets preserve the horizontal center. Automatic measurements are
  never recycled as fitting constraints.
- Available bounds come from fixed dimensions, parent layout constraints or
  explicit maximum dimensions. Icon spacing belongs to the skin's Label
  region. Automatic measured dimensions are not fed back as fit constraints.
- A finite zero-sized region is constrained. An automatic axis is unconstrained.
- Search performs at most 16 metric comparisons after the endpoint checks,
  followed by verification of the rounded result.
  Intermediate results are rounded down to tenths of a logical pixel while
  retaining the minimum. Base sizes and minimums may be fractional.
- If text still cannot fit at the minimum, `textFitOverflow` is true after
  validation and ordinary clipping remains. The project can shorten its
  wording, change formatting or enlarge the region. The engine never changes
  amounts, translations, currency symbols or the authored text.
- The fit result is cached for unchanged metrics and bounds. Recalculation is
  part of UI validation rather than a per-frame or project-wide scan.

These two read-only results are runtime observations, not authored KUI fields.
CLI emits the policy and base size; ui-runtime uses the same native Label. Neither
writes the derived size into XML, styles, semantic documents or history.

Finite zero content width reports overflow for nonempty displayed text; it is
not mistaken for empty content by Core's zero-width measurement. Empty displayed
content retains its base size without overflow.

Load fonts before constructing or measuring text where possible. If a font
becomes ready later, call `label.invalidateSize()` before the next validation;
this clears both fitting and Core line metrics even when the family name stays
the same. Direct Core users call `textField.invalidateTextMetrics()`.

## Verification

Core tests cover dynamic/input defaults, explicit mode changes, every hard
separator, width wrapping and fixed-height clipping. UI tests cover multilingual
and currency strings, minimum overflow, outlines, font readiness, state size
restoration, password display, automatic dimensions and parent resize stability.
Native Button tests cover the label's actual available region, changing content,
disabled-state restoration and replacing the active skin without updating the
detached label.
Shared-schema, CLI and ui-runtime tests cover XML round trips, invalid policies,
read-only boundaries and materialized preview without authored-document changes.
Tests use deterministic Canvas measurement doubles; actual platform fonts can
produce different fitted sizes.

Browser verification also covers WebGL and Canvas with Chakra Petch regular and
bold fonts from the KUI example, plus platform fallback for Chinese. It checks
single-line fitting, Unicode wrapping without leading separator spaces, outline
allowance, minimum overflow, native Button state restoration and invalidation
after a font finishes loading. Fitted sizes are platform-dependent; these checks
assert the layout contract rather than a universal numeric result.

Multiline tests cover complete-height fitting, blank/trailing rows, line spacing,
Unicode and grapheme boundaries, password text, minimum/zero-width overflow,
outline allowance, automatic axes, font readiness and parent resize recovery.
Minified browser tests validate native Russian/Chinese layouts in Canvas,
WebGL 1 and WebGL 2 at 1x/2x, using independent Canvas width measurements.
Pixel comparisons verify unchanged painting across fitting toggles for all nine
horizontal/vertical alignments and automatic dimensions; icon-and-caption row
tests retain parent geometry.

Browser suites include exact clipped/unclipped pixel comparisons in real
Scroller viewports, across all nine alignments, italic text, thick outlines,
automatic/fixed/maximum/fitted bounds, and Japanese scroll tails. Minified Canvas,
WebGL 1 and WebGL 2 tests use physical 1x/2x targets. Unit tests additionally
cover font frames taller than authored sizes, state outline restoration, late fonts,
empty text, EditableText isolation and repeated top-aligned typewriter prefixes.

Stable-text browser fixtures additionally load licensed font subsets for 31
languages: Latin variants, Greek, Cyrillic, Arabic, Hebrew, Hindi, Bengali, Thai,
Japanese, simplified/traditional Chinese and Korean. They check accents without
baseline movement, automatic/fixed dimensions, wrapping, clear/retype cycles,
fit/resize recovery and unclipped marks/outlines inside Scrollers at 1x/2x.

Text-components browser checks compare Label and RichLabel pixels in identical
content regions, accounting for Label's outline insets. RichLabel mixed-font,
size, color, bold/italic and outline runs are compared against a native TextField
with the same authored flow, including automatic/fixed height and wrapping.
Repeated clear/retype cycles render every prefix and retain the first baseline
for all 31 languages. RichLabel retains its own typography/measurement contract;
Label alone provides textFit and outline-safe outer insets.
