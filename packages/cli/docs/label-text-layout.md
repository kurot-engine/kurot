# Label text compilation

CLI 3.6.0 consumes ui-document ^0.13.0 and compiles KUI text-fitting properties
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

- The application must install UI `^3.1.0` and Core `^2.1.0` for shrinking.
  These are the feature's original API minimums. Installing current UI 3.4.0
  requires Core `^2.4.0` for that package's centered-flip contract.
  They remain application dependencies; CLI depends on the headless document
  package rather than importing the engine into the build process.
- `textFit` is `none` by default or `shrink` for ordinary single-line Labels.
  Put a Button's policy on its `labelDisplay` skin part.
- `minFontSize` defaults to 12 logical pixels and must be finite and >= 1.
  A minimum greater than the authored size does not enlarge the text.
- UI keeps `size` authored and derives `renderedSize` after layout validation.
  State removal restores the authored base size before fitting again.
- `renderedSize` and `textFitOverflow` are runtime observations; do not author
  them in KUI XML.
- Multiline Labels keep their base size; EditableText rejects shrinking.
- Load fonts before measuring text. For late loading, native UI callers use
  `label.invalidateSize()` after the font becomes ready.

UI 3.1's public Label contract owns the full fitting, overflow, layout and
font-readiness rules. ui-document 0.9's catalog describes the authoring fields.
The build does not rewrite existing skins or apply project translation rules.

## Migration

In Core 2.1.0, explicit `multiline="false"` means one unwrapped first line.
Remove that flag or set it to true where wrapping is intended. The literal-string
XML contract is retained: a backslash followed by `n` stays literal text rather
than becoming a hard separator.

Existing EXML projects remain on CLI 1.3.x. The KUI release does not introduce
an EXML migration or resource-format change.
