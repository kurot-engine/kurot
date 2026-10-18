# Label text compilation

The CLI consumes ui-document ^0.13.0 and compiles KUI text-fitting properties
through the existing UIDocument → SkinIR → ESM factory pipeline. The semantic
document format remains version 2.

## Example

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="skins.AmountSkin" states="down">
    <Label id="amount" text="100.80" width="60" size="24"
           multiline="false" textFit="shrink" minFontSize="16" size.down="20" />
</Skin>
```

The generated factory assigns the authored values:

```js
amount.multiline = false;
amount.textFit = 'shrink';
amount.minFontSize = 16;
amount.size = 24;
```

The down-state size becomes a native `SetProperty('amount', 'size', 20)` override.
The compiler does not measure fonts or change `size` based on text length,
currency, locale or display bounds. Source XML remains authored data; neither
derived sizes nor fitting diagnostics are persisted by compilation.

Label presets supply baseline appearance before local and state fields are
applied. They do not own wrapping or fitting policy, and preset expansion never
introduces build-time text measurement. See the
[shared style contract](../../ui-document/docs/project-styles.md).

## Runtime boundary

- Applications supply an accepted Core/UI pair and satisfy the installed UI's
  Core peer. The compiler depends on the headless document kernel.
- `textFit` is `none` by default or `shrink` for ordinary Labels.
  Supported fitting modes and bounds follow the installed native UI contract.
  Put a Button's policy on its `labelDisplay` skin part.
- `minFontSize` defaults to 12 logical pixels and must be finite and >= 1.
  A minimum greater than the authored size does not enlarge the text.
- UI keeps `size` authored and derives `renderedSize` after layout validation.
  State removal restores the authored base size before fitting again.
- `renderedSize` and `textFitOverflow` are runtime observations; do not author
  them in KUI XML.
- EditableText rejects shrinking. Current native Label supports fitting in either
  line mode; `multiline` continues to choose line generation.
- Load fonts before measuring text. For late loading, native UI callers use
  `label.invalidateSize()` after the font becomes ready.

The [native Label contract](../../ui/docs/label-text-layout.md) owns fitting,
overflow, layout and font-readiness rules. The compiler does not rewrite
existing skins or apply project translation rules.

## Authored line policy

Explicit `multiline="false"` means one unwrapped first line.
Remove that flag or set it to true where wrapping is intended. The literal-string
XML contract is retained: a backslash followed by `n` stays literal text rather
than becoming a hard separator.

EXML authoring uses the CLI 1.x line. This KUI compiler does not migrate EXML.
