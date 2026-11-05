# Native text materialization

The runtime requires Core `^2.4.0`, UI `^4.1.0` and document `^0.14.0`.
It materializes BitmapLabel and RichLabel with their real native constructors;
both remain independent of Label. RichLabel exposes seven component typography
properties; Label presets, fitting and plain text remain separate contracts.

```ts
import { parseUIDocument, UIAssetRegistry } from '@kurot/ui-document';
import { createKurotUI } from '@kurot/ui-runtime';

const assets = new UIAssetRegistry();
assets.registerResource({ key: 'score_font', resourceType: 'font' });
const document = parseUIDocument(`
<Skin xmlns="https://kurot.dev/ui/1" class="TextSkin">
    <BitmapLabel id="score" font="score_font" text="100.80" />
    <RichLabel id="notice" width="240" size="20" stroke="1">
        <textFlow>
            <Span text="Balance: " />
            <Span text="100.80" bold="true" textColor="#FFCC00" />
        </textFlow>
    </RichLabel>
</Skin>`);

// The application configures Core's resource loader and owns its Stage.
const result = createKurotUI(document, { assets });
stage.addChild(result.root);
```

The default font adapter returns the resource key. BitmapLabel uses Core's
configured font analyzer to load the descriptor and page. Applications can
instead supply `resourceAdapters.font` returning a ready BitmapFont. Other
resolved objects fail with invalid-property at the exact property path.
Semantic resource registration validates identity/type; it does not replace
Core loader configuration or load bytes. Disposal removes runtime listeners;
the caller/cache retains ownership of fonts, textures and the stage root.

RichLabel textFlow uses the shared isUITextFlow contract, and the native setter
copies every run and style. The runtime preserves literal content and applies
fontFamily, size, textColor, stroke, strokeColor, bold and italic, plus multiline,
lineSpacing, textAlign, verticalAlign and wordWrap alongside normal geometry.
Omitted run fields follow the corresponding component value; explicit false/zero
values win. Typography never modifies raw flow snapshots. Native measurement
follows font and width/maxWidth changes. TextFit, textStyle, baseStyle and plain
text are not RichLabel properties.

Appearance states use native SetProperty. Reusable component states and data
bindings use the existing atomic transaction path. Flow overrides replace the
whole array; [] clears, omission inherits. Leaving a state restores owned
copies, and absent font/content restore to undefined/[] respectively. A later
adapter failure rolls back earlier flow/font writes and preserves the previous
state or data-controller value.

Declare a bound data field with `{ valueType: 'array', format: 'text-flow' }`.
An unconstrained array schema is insufficient because every supported run must
be validated before assignment. Plain malformed values and unsupported native
properties fail instead of being attached as arbitrary object fields.

Use the runtime's declared peer ranges and the chosen UI's Core requirements.
Editor-specific font controls and rich-text editing belong to consumer tooling.
