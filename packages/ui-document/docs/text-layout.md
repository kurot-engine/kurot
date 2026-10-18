# Label text authoring

This headless catalog validates Label/EditableText properties and preserves
KUI intent without measuring fonts or rendering. Semantic format version is 2.
[BitmapLabel/RichLabel](text-components.md) have separate contracts. Catalog
alignment defaults to middle; explicit values win and omitted fields stay omitted.
Native omitted defaults follow the installed Core; set important alignment explicitly.

## Properties

| Property      | Label default | EditableText default | Authoring contract                                                                                               |
| ------------- | ------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `verticalAlign` | `middle` | `middle` | Current catalog default; native defaults follow the installed Core. Explicit top/bottom remain effective. |
| `multiline`   | `true`        | `false`              | Allows hard separators and width wrapping. Explicit false renders the first line without wrapping. |
| `wordWrap`    | `false`       | `false`              | True chooses Unicode boundaries; false chooses character boundaries. Applies only in multiline mode.             |
| `textFit`     | `none`        | `none`               | Label accepts `none` or `shrink`; EditableText accepts only `none`.                                              |
| `minFontSize` | `12`          | `12` (inherited)     | Finite number >= 1 in logical pixels. Does not enable fitting on EditableText.                                   |
| `size`        | `30`          | `30`                 | Authored font size. Runtime fitting never rewrites it.                                                           |

Defaults describe native behavior; they are not inserted into parsed documents
or emitted when absent in the input. `renderedSize` and `textFitOverflow` are
derived runtime results, deliberately absent from the authoring catalog.

## KUI example

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="skins.AmountSkin" states="down">
    <Label id="labelDisplay" text="KZT 10 000,00" width="140" size="24"
           multiline="false" textFit="shrink" minFontSize="16" size.down="20" />
</Skin>
```

`size` and `size.down` remain authored inputs across parse/serialize round trips.
The runtime fits from the currently active base size, not a persisted derived
size. Put a Button's fitting policy on its `labelDisplay` skin part; Button
itself does not expose these typography properties.

The catalog accepts shrinking independently of multiline, including omission
of the flag. Native Label fits complete multiline layouts while retaining the
base size whenever all rows fit.
Minimums above the base size do not
enlarge text. If content cannot fit at the minimum, the runtime reports overflow
and uses its ordinary clipping rules; source text is never shortened or changed.

For multiline fitting, constrain the Label's own width and height (or parent
allocations/maximums), for example width="120" height="44" size="20"
textFit="shrink" wordWrap="true". A button's height alone does not constrain an
automatically sized Label. Automatic axes stay unconstrained; a height does not
cap row count or switch multiline. Outline allowance participates in constrained
fit checks and wrapping. Native Label reserves outline-safe content bounds;
see [Label layout](../../ui/docs/label-text-layout.md) for current measurement
and alignment. The headless catalog performs no font measurement.

## Validation boundary

Use component-aware validation after parsing when checking authoring fields:

```ts
import { createKurotUIFoundationRegistry, parseUIDocument, validateUIDocumentComponents } from '@kurot/ui-document';

const registry = createKurotUIFoundationRegistry();
const document = parseUIDocument(source);
const diagnostics = validateUIDocumentComponents(document, registry);
```

Structural XML parsing and component-aware validation are distinct steps.
The foundation catalog rejects unknown fit policies, minimums below 1,
editable shrinking and authored runtime observations. Ordinary document
validation rejects non-finite property values. No cross-field font measurement
or automatic migration occurs in this package.

## Runtime and compiler integration

CLI expands authored values into Skin factories; ui-runtime forwards them to
native UI. Use compatible peers from the [dependency graph](../../../docs/dependency-policy.md)
and satisfy the chosen UI's Core requirement. Explicit multiline=false selects
a single line. XML string values are literal; a backslash followed by n remains
text, not a parser-generated line break.
