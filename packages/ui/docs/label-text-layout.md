# Label text layout and fitting

Introduced in UI 3.1.0 with Core >= 2.1.0, fitting is single-line in UI 3.1.0–3.4.0.
UI 3.5.0 extends it to multiline Labels using Core's existing independent
measurement API. Version 3.5.0 is published, verified on npm on 2026-10-10. Its peer remains
Core ^2.4.0 for centered flips. The public
`TextFitMode` type is `none | shrink`. Native UI depends only on Core. KUI
authoring introduced fitting metadata in ui-document 0.9.0 and retains it in
0.13.1. Current CLI 3.6.0 and runtime 0.10.0 use document `^0.13.0`; runtime
also requires UI `^3.4.0` and Core `^2.4.0`. Older 0.x kernel ranges do not
automatically accept 0.13.0. Label presets expand into native properties before
rendering; their precedence does not change fitting behavior. See the
[project style contract](../../ui-document/docs/project-styles.md).

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

Explicit `multiline="false"` in older skins now means a real single line.
Remove it or set it to `true` for text intended to wrap. No files are migrated
automatically; omitted Label flags continue to allow wrapping.

## Vertical alignment and skin defaults

Label, RichLabel and EditableText inherit TextField's default; BitmapLabel
inherits BitmapText's. With published Core 2.5.3 they default to
`verticalAlign="middle"`. Published Core 2.5.2 and earlier default to top. Button
skins in the native KUI kit already set middle explicitly. Button does not
overwrite an authored top/bottom or a skin state. Use explicit top for content
intended to start at the top of a taller box. `verticalCenter` positions the
Label box in its parent; it does not align text inside the Label.

Published document 0.13.1 reports the new middle default without writing omitted
properties into XML. Adopting editors need matching Core/catalog installations;
UI 3.4.0 itself requires no release or higher peer minimum. Existing applications
retain their installed behavior until they update their locks and rebuild.

Published Core 2.5.2 makes dynamic top/middle/bottom use the same
complete glyph-block boundaries in single-line and multiline modes. Blank rows
retain their height. `multiline` controls only line generation. Input uses stable
editing-row boundaries in all three modes; its caret and selection remain stable.
Measurements and fitting stay nominal. Older Core installations retain their
recorded text behavior; adopt the Core installation/lock and rebuild.
UI 3.4.0's peer accepts 2.5.2; this correction needs no UI release.
See [Core text layout](../../core/docs/text-layout.md#unified-vertical-alignment-core-252).

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

| Available bounds | Multiline shrink behavior |
| --- | --- |
| Both automatic | Retain base size; soft wrapping has no width constraint. |
| Width constrained, height automatic | Wrap and measure automatic height; shrink only if a protected sequence still exceeds width. |
| Width automatic, height constrained | Measure hard-separated rows without soft wrapping, then fit their complete height. |
| Both constrained | Wrap and shrink as needed to fit complete width and height. |

- `size` is always the authored/base size. `renderedSize` is the derived drawing
  size after layout validation. State overrides capture and restore `size`.
- Fit starts from that base size on every metric change. Shorter text or a
  larger region restores the base size; text never grows beyond it.
- `minFontSize` defaults to 12 logical pixels, must be finite and at least 1,
  and acts as a lower bound. A minimum above `size` never enlarges the text.
- Measurement uses the displayed text, font family, bold and italic settings,
  and reserves twice the outline thickness on each constrained axis. Search,
  measurement and drawing use the same reserved wrapping width. Horizontal
  alignment retains the original Label's left edge, center or right edge;
  vertical alignment retains the full original height. Fitting adds no implicit
  padding or outline inflation to automatic measured dimensions. A maximum
  width reserves outline space once, even when the measured Label is narrower.
  Toggling fitting leaves unchanged text at unchanged size in its original
  position. Core's nominal measurement, clipping and outline rendering rules
  remain in effect.
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

Existing multiline Labels with an authored `shrink` policy begin fitting when
they adopt UI 3.5.0; the published 3.4.0 runtime ignored that
combination. Single-line hard-separator/password semantics remain effective.
Finite zero content width reports overflow for nonempty displayed text; it is
not mistaken for empty content by Core's zero-width measurement. Empty displayed
content retains its base size without overflow.

Core, KUI format and dependency minima require no change. CLI/runtime already
pass the fields through; runtime 0.10.0's ^3.4.0 peer accepts UI 3.5.0.
Applications adopt the UI installation/lock and rebuild explicitly. Editor
0.28.2's local trial removes the old single-line Inspector restriction and uses
exact registry UI 3.5.0 with a matching lock and ordinary App build. The selected
Tentax and MilfMaster templates also install 3.5.0 with matching locks and rebuilt
outputs. Preview and compiled games use the native Label behavior.

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
