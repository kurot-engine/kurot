# Project styles

The fixed resource/config/style.json is plain project configuration, independent
of default.res.json. The kernel exports parseUIStyleSheet, getUIStyleFontAlias,
getUIStyleFontFamily, getUIStyleColor and resolveUIStyleColors, plus Label preset
resolution. The document format is 2 and style schemaVersion is 1.

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
overrides. Label presets are described below. Authored palette references use
`@style:colors:<key>`; other color-token prefixes are rejected. Ordinary string properties remain literal, including reference-looking text.

resolveUIStyleColors resolves color-token records into a disposable copy, including
nested trees and state/variant overrides. Literal text resembling a token stays
literal. XML serialization and document history must keep authored references;
never save the expanded copy. Other token categories remain unchanged.

Browser font loading and project color publication remain application responsibilities.
The helper performs no filesystem access, font loading or rendering. Native runtime
consumers can alternatively register the parsed colors in UIAssetRegistry as color
design tokens. Label preset support in 0.11.0 is specified below.
An enabled control restores its own normal color rather than a
hardcoded universal white. Build-time expansion does not add live game theme switching.

## Label typography presets

The optional `labels` section contains sparse, non-inheriting presets. Names use
lowercase letter-led keys with digits/hyphens. Omitting the section yields an empty
immutable map. Existing XML is never assigned presets automatically.
The exported `UIStyleSheet` type requires this map; `parseUIStyleSheet()` supplies
it even when the optional JSON section is omitted.

```json
"labels": {
  "button": {
    "fontFamily": "@style:fonts:primary",
    "size": 24,
    "textColor": "@style:colors:disabled-text",
    "stroke": 2,
    "strokeColor": "#000000",
    "bold": true,
    "italic": false,
    "textAlign": "center",
    "verticalAlign": "middle",
    "lineSpacing": 4
  }
}
```

Allowed fields are exactly those shown. `fontFamily` accepts a literal CSS stack
or `@style:fonts:<role>`, which resolves to the existing alias/fallback stack.
Colors accept `#RRGGBB` or `@style:colors:<key>`, including black. Numeric, boolean
and alignment values use the foundation Label schema; unknown fields, missing
roles/colors and invalid values report their configuration paths. Presets do not
own text, geometry, wrapping, fitting, language selection or Skin state selectors.

```xml
<Label text="Confirm" textStyle="@style:labels:button"
       size="28" size.disabled="20" />
```

Precedence is **state field > local field > preset field > native default**.
Bind `textStyle` only on Label in Default. Remove a local field to inherit the
preset; remove the reference to return to local/native styling. Explicit false
and zero still override a preset. Selecting a preset never removes existing local
properties. Named states override individual fields; `textStyle.<state>`, variants,
instance-part overrides and parameter/data bindings to textStyle are rejected.
This authoring directive is not a Core/UI runtime property.

```ts
import { resolveUILabelStyles, resolveUIStyleColors } from '@kurot/ui-document';
const expanded = resolveUILabelStyles(authored, style);
const preview = resolveUIStyleColors(expanded, style.colors);
```

Resolve every Skin, including nested components and list item skins, before
materialization. Keep the original document for saving and history. Missing style
configuration or preset references fail explicitly; the resolver performs no I/O.
Font loading remains a consumer responsibility. No live theme switching or native
renderer change is required. SchemaVersion stays 1 and document format stays 2.

Compiler/preview consumers must share the installed kernel's parser and style
contract. Expand disposable copies and retain authored preset/color references
for saving and undo. CLI-built games need no ui-runtime dependency.
