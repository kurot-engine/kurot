# Native text materialization

ui-runtime 0.9.0 requires Core `^2.3.0`, UI `^3.3.0` and ui-document `^0.12.0`.
It materializes BitmapLabel and RichLabel with their real native constructors;
neither inherits Label or accepts whole-component Label typography/presets.

```ts
import { parseUIDocument, UIAssetRegistry } from '@kurot/ui-document';
import { createKurotUI } from '@kurot/ui-runtime';

const assets = new UIAssetRegistry();
assets.registerResource({ key: 'score_font', resourceType: 'font' });
const document = parseUIDocument(`
<Skin xmlns="https://kurot.dev/ui/1" class="TextSkin">
    <BitmapLabel id="score" font="score_font" text="100.80" />
    <RichLabel id="notice" width="240">
        <textFlow>
            <Span text="Balance: " size="20" />
            <Span text="100.80" size="20" bold="true" textColor="#FFCC00" />
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
only multiline, lineSpacing, textAlign, verticalAlign and wordWrap alongside
normal geometry. Native measurement follows width/maxWidth changes. Label's
font size, textFit, textStyle and plain text do not apply to RichLabel.

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

Core 2.3.0 is the API minimum. Use 2.3.1 to include the blank-run metrics patch.
Existing apps retaining runtime 0.8.2 need no forced migration. Editor-specific
font controls and rich-text editing remain a separate consumer integration.
