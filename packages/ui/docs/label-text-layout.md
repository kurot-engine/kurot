# Label text layout and fitting

Introduced in UI 3.1.0 with Core >= 2.1.0, this fitting contract remains in
UI 3.4.0, whose package requires Core ^2.4.0 for centered flips. The public
`TextFitMode` type is `none | shrink`. Native UI depends only on Core. KUI
authoring introduced fitting metadata in ui-document 0.9.0 and retains it in
0.13.0. Current CLI 3.5.0 and runtime 0.10.0 use document `^0.13.0`; runtime
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
single-line Labels. Multiline Labels retain their authored size; EditableText
rejects `shrink`, including through the shared authoring schema. Put the policy
on a Button's `labelDisplay` skin part rather than on the Button itself.

- `size` is always the authored/base size. `renderedSize` is the derived drawing
  size after layout validation. State overrides capture and restore `size`.
- Fit starts from that base size on every metric change. Shorter text or a
  larger region restores the base size; text never grows beyond it.
- `minFontSize` defaults to 12 logical pixels, must be finite and at least 1,
  and acts as a lower bound. A minimum above `size` never enlarges the text.
- Measurement uses the displayed text, font family, bold and italic settings,
  and reserves twice the outline thickness on each constrained axis. The
  ordinary Core clipping and outline rendering rules remain in effect.
- Available bounds come from fixed dimensions, parent layout constraints or
  explicit maximum dimensions. Icon spacing belongs to the skin's Label
  region. Automatic measured dimensions are not fed back as fit constraints.
- A finite zero-sized region is constrained. An automatic axis is unconstrained.
- Search performs at most 16 metric comparisons after the endpoint checks.
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
