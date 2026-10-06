# Project styles

The fixed resource/config/style.json is plain project configuration, independent
of default.res.json. ui-document 0.10.0 exports parseUIStyleSheet,
getUIStyleFontAlias, getUIStyleFontFamily, getUIStyleColor and resolveUIStyleColors.
Version 0.11.0 adds Label presets and is published. The document
format remains version 2; style schemaVersion remains 1.

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
overrides. Published 0.10.0 supports colors in XML; the 0.11.0 Label preset
extension below adds labels.
The previous `@token:color:<key>` syntax is rejected; update authored references
explicitly. Ordinary string properties remain literal, including reference-looking text.

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

## Adoption

CLI and Editor must share the parser and stylesheet contract. Published CLI
3.3.0 and ui-document 0.11.0 support fonts, colors and Label presets. Existing
`^0.9.0` and `^0.10.0` dependency/peer ranges exclude 0.11.0. Published runtime 0.8.2
requires `^0.11.0`; applications expand presets and resolve colors in
preview copies before materialization. Color-only consumers may register the
palette as color design tokens. No Core/UI rendering change is required. Consumers read the
optional configuration, load/register fonts and resolve colors before materialization;
the kernel never creates a missing style.json or rewrites project files.

## Label typography presets in 0.11.0

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

Version 0.11.0 is published. These APIs are not in ui-document 0.10.0 or CLI
3.2.1. Published CLI 3.3.0 uses the registry kernel through `^0.11.0`, without
a local override. The KUI sample and engine examples use this compiler.
Published ui-runtime 0.8.2 uses the same peer/development range;
runtime 0.8.1 excludes the new kernel. Editor 0.19.2 installs all three registry packages.
Callers expand presets before its unchanged native materializer without a
Core/UI update. Editor and application locks must use the same published
kernel contract; do not silently upgrade legacy EXML projects.
