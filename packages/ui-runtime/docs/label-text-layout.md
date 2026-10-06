# Label text layout

ui-runtime 0.8.2 requires Core `^2.1.0`, UI `^3.1.0` and ui-document `^0.11.0`.
It applies authored text properties to native Labels rather than measuring text
or fitting fonts itself. CLI 3.3.0 compiles the same properties into KUI skins.

Callers expand Label presets with `resolveUILabelStyles()` before color resolution
and materialization. Presets supply appearance defaults; local and state fields
win. Authored text, geometry, fitting policy and XML/history remain unchanged.

## Materialization

```ts
import { Label } from '@kurot/ui';
import { parseUIDocument } from '@kurot/ui-document';
import { createKurotUI } from '@kurot/ui-runtime';

const document = parseUIDocument(`
<Skin xmlns="https://kurot.dev/ui/1" class="AmountSkin">
    <Label id="amount" text="100.80" width="72" size="24"
        multiline="false" textFit="shrink" minFontSize="16" />
</Skin>`);

const result = createKurotUI(document);
stage.addChild(result.root);

const amount = result.instances.get('amount');
if (amount instanceof Label) {
	amount.validateNow();
	// size remains 24; renderedSize reflects the validated drawing size.
	const renderedSize = amount.renderedSize;
	const overflow = amount.textFitOverflow;
}
```

`multiline` defaults to `true` on Label and `false` on EditableText. An explicit
`false` keeps only the first hard line and disables automatic wrapping even when
height is automatic. With `true`, wrapping remains native Core behavior.

`textFit` defaults to `'none'`. `'shrink'` fits a single-line Label to its native
layout bounds, including explicit dimensions, parent constraints and maximum
size limits. Automatic axes without a constraint do not impose a fit limit.
`minFontSize` defaults to 12 and accepts finite values at least 1; it never
enlarges text above the authored size. EditableText permits only `'none'`.

`renderedSize` and `textFitOverflow` are read-only native observations after
layout. They are not authoring properties, bindings or serialization inputs.
The shared catalog rejects invalid fitting modes and minimum sizes before
materialization.

## Updates and lifecycle

Native Label setters invalidate layout after changes to text, bounds or font
metrics. Data bindings, component-state controllers and native appearance states
all use those same setters. A state size override changes the authored base size
for that state; leaving it restores the earlier base size and fits it again.
Derived drawing sizes never become the values captured for restoration.

Applications own font loading. Once a font is ready, call `invalidateSize()` on
affected Labels to clear cached metrics and request fitting with the new font.
The runtime does not start a font loader or subscribe to document font events.

Materialization and fitting leave the input document unchanged. Saving continues
to serialize the authored size, fit policy and minimum. Literal XML text remains
literal, including decimal strings and backslashes. No automatic XML migration
is performed.

The application owns the Stage: remove `result.root` when it is no longer needed
and call `result.dispose()` to release the listeners owned by materialization.
See [the native UI contract](../../ui/docs/label-text-layout.md) for measurement
details and limitations.
