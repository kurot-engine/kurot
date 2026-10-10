# Label text authoring

This document describes ordinary Label/EditableText. BitmapLabel and RichLabel
have independent [text authoring contracts](text-components.md); Label presets
and automatic shrinking do not apply to them.

ui-document 0.9.0 adds text-fitting metadata to the foundation component catalog.
It remains headless: this package validates authored values and preserves them
in KUI XML; it does not measure fonts or render text. The semantic document
format remains version 2.

## Vertical alignment default in 0.13.1

Published ui-document 0.13.1 reports `verticalAlign="middle"` for Label and
EditableText, as well as independent RichLabel/BitmapLabel. It matches published
Core 2.5.3. Published document 0.13.0 and Core 2.5.2 use top as their defaults.
Explicit top/bottom and named-state overrides are preserved in either line mode;
multiline only controls hard breaks and wrapping. Omitted properties stay omitted
in XML and history, and format 2 is unchanged.

Editors adopt the new runtime and catalog together so an omitted
value agrees between inspector and preview. CLI 3.6.0/runtime 0.10.0 already accept
0.13.1 through ^0.13.0, with no SDK version bump or new Core dependency here.
The catalog does not change an older runtime's defaults. Content with omitted
alignment can move inside a taller box; set top explicitly when it should start
at that box's top. No project files are migrated automatically.

## Properties

| Property      | Label default | EditableText default | Authoring contract                                                                                               |
| ------------- | ------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `verticalAlign` | `middle` | `middle` | Published 0.13.1 default, matching Core 2.5.3. Explicit top/bottom remain effective. |
| `multiline`   | `true`        | `false`              | Allows hard separators and width wrapping. Explicit false renders the first line without wrapping in Core 2.1.0. |
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

Shrinking is a single-line native Label capability. A multiline Label may
retain the policy in its authored document, but the runtime retains its base
font size while multiline is enabled. Minimums above the base size do not
enlarge text. If content cannot fit at the minimum, the runtime reports overflow
and uses its ordinary clipping rules; source text is never shortened or changed.

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

## Consumers and migration

Current CLI 3.5.0 and runtime 0.10.0 consume the fitting catalog through document
^0.13.0. Older 0.x dependency/peer ranges do not automatically accept it;
the fitting metadata and semantic format remain unchanged. Fitting's original
native API minimum is Core 2.1.0/UI 3.1.0. Current runtime 0.10.0 requires Core
^2.4.0/UI ^3.4.0 for centered flips. The public UI contract describes
fit bounds, state restoration and font-readiness invalidation in detail.

Explicit `multiline="false"` previously did not prevent dynamic text wrapping.
For text intended to wrap, remove the flag or set it to true before rendering
with Core 2.1.0. Existing files are not rewritten automatically. String XML
properties retain the literal-string contract introduced in 0.8.0: a literal
backslash followed by `n` is text, rather than an escape interpreted by the
document parser.
