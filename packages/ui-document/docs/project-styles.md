# Project fonts and named colors

The fixed resource/config/style.json is plain project configuration, independent
of default.res.json. ui-document 0.10.0 exports parseUIStyleSheet,
getUIStyleFontAlias, getUIStyleFontFamily, getUIStyleColor and resolveUIStyleColors.
The document format remains version 2; style schemaVersion remains 1.

```json
{
	"schemaVersion": 1,
	"fonts": {
		"default": "primary",
		"families": {
			"primary": {
				"fallback": ["Arial", "sans-serif"],
				"faces": [{ "url": "assets/fonts/Regular.ttf", "weight": 400 }]
			}
		}
	},
	"colors": { "disabled-text": "#999999" }
}
```

Font roles use lowercase letter-led keys with digits/hyphens. Each family includes
weight 400; weights are unique, in 100–900 steps of 100. Font URLs are
resource-relative TTF/OTF/WOFF/WOFF2 paths. Fallback names form an ordered CSS
stack after the stable kurot-<role> alias. Fonts are required in an existing
stylesheet; colors are optional and default to an empty palette.

Colors use the same key grammar and exactly six hexadecimal RGB digits prefixed
with #. Parsing publishes an immutable numeric palette, retaining black as zero.
Missing keys and invalid colors fail rather than silently substituting values.

```xml
<Label textColor="#FF9900" textColor.disabled="@style:colors:disabled-text" />
```

`@style:colors:<key>` selects the `colors` section of `style.json`; the key maps
to an authored RGB value. Parsing retains the semantic color-token record and
serialization emits this stylesheet reference in both base properties and state
overrides. Only the colors section is currently supported by this XML syntax.
The previous `@token:color:<key>` syntax is rejected; update authored references
explicitly. Ordinary string properties remain literal, including reference-looking text.

resolveUIStyleColors resolves color-token records into a disposable copy, including
nested trees and state/variant overrides. Literal text resembling a token stays
literal. XML serialization and document history must keep authored references;
never save the expanded copy. Other token categories remain unchanged.

Browser font loading and project color publication remain application responsibilities.
The helper performs no filesystem access, font loading or rendering. Native runtime
consumers can alternatively register the parsed colors in UIAssetRegistry as color
design tokens. Complete Label typography presets and state-selection policy are
outside this slice. An enabled control restores its own normal color rather than a
hardcoded universal white. Build-time expansion does not add live game theme switching.

## Adoption

CLI and Editor must use the same 0.10.x parser and stylesheet contract. Existing
`^0.9.0` dependency and peer ranges exclude 0.10.0 and require an explicit update.
Published CLI 3.2.0 depends on `^0.10.0` and resolves stylesheet colors during
KUI compilation. ui-runtime 0.8.1 adopts the same range; applications resolve
colors in preview copies or register the palette as color design tokens before
materialization. No Core/UI rendering change is required. Consumers read the
optional configuration, load/register fonts and resolve colors before materialization;
the kernel never creates a missing style.json or rewrites project files.
