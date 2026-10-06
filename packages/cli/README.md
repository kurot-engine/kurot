# @kurot/cli

Build tooling for the Kurot UI Editor workflow. It uses esbuild, emits ES2022
ESM, and compiles canonical KUI XML skins into runtime theme modules.

> **Current version: 3.2.1 (prepared for publication).** Requires `@kurot/ui-document@^0.10.0`
> and Node.js 20 or later. The CLI runs only at build time.

> **Release scope:** The 3.x line is dedicated to Kurot Editor integration.
> Existing game projects that use EXML should remain on
> `@kurot/cli@1.3.x`. The KUI toolchain is not an in-place project upgrade and does
> not require those projects to change their configuration or UI assets.

See [CHANGELOG.md](CHANGELOG.md) for release history.

Version 3.2.1 adds project styles, bundled fonts and English translations to the
game template. Existing projects are not rewritten. See [game template setup](docs/game-template.md).

## Label text fitting in 3.1.0

The shared ui-document catalog supports Label `textFit` and `minFontSize`
in KUI XML:

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="skins.AmountSkin" states="down">
    <Label id="labelDisplay" text="KZT 10 000,00" width="140" size="24"
           multiline="false" textFit="shrink" minFontSize="16" size.down="20" />
</Skin>
```

The compiler emits the policy, base size and state overrides unchanged. UI
derives the drawing size after layout validation. Rendering this capability
requires `@kurot/ui@^3.1.0` and `@kurot/core@^2.1.0` in the application.
Explicit `multiline="false"` means one unwrapped first line; remove it or set
it to true for text intended to wrap. Files are not migrated automatically.
See the [compilation contract](docs/label-text-layout.md) and
[native Label contract](../ui/docs/label-text-layout.md).

## Usage

The CLI does not require a global install.

```bash
npx @kurot/cli@3.2.1 create my-game
cd my-game
pnpm install
pnpm dev
```

Scaffolded projects expose `build`, `dev`, and `clean` scripts. For an
Editor-managed KUI XML project, install the package with
`pnpm add -D @kurot/cli@^3.2.1`. Existing EXML projects should keep their current
1.3.x dependency.

## Commands

### `kurot create`

```bash
kurot create <name> [--template game|empty]
```

The `game` template includes `@kurot/core`, `@kurot/game`, `@kurot/ui`,
`@kurot/ui-document`, KUI skins, project styles/fonts, English translations,
resource loading, and an editable HTML template. Fonts load before creating UI;
translations register after preload. The `empty` template contains a minimal
`Sprite` application without UI/style/language dependencies.

### `kurot build`

```bash
kurot build [--release] [--sourcemap] [--watch] [--analyze]
            [--strict] [--diagnostics human|json]
```

Development output is written to `bin-debug/`. Release output is written to
`bin-release/web/<timestamp>/` with minified, content-hashed files. Engine,
project namespace, theme, and application code are separate ESM chunks joined
by the generated HTML import map.

`--diagnostics json` reserves stdout for one machine-readable build result.
Release builds apply strict diagnostic policy by default.

### `kurot dev`

```bash
kurot dev [--port 3000] [--sourcemap] [--strict]
          [--diagnostics human|jsonl]
```

The development server rebuilds TypeScript, KUI XML, custom namespaces, and
the component catalog as their sources change. Browser refresh is currently
manual. JSONL mode reserves stdout for incremental build and server events.

### `kurot clean`

Removes `bin-debug` and `bin-release`.

## Configuration

Create `kurot.config.ts` in the project root:

```ts
export default {
	target: 'html5',
	entry: 'src/Main.ts',
	output: { dir: 'bin-debug' },
	html: { template: 'template/web/index.html' },
	stage: {
		width: 640,
		height: 1136,
		scaleMode: 'showAll',
		orientation: 'auto',
		frameRate: 60,
	},
	ui: {
		sourceDir: 'resource/ui',
		components: {
			namespace: 'game',
			sourceDir: 'src/components',
			skinDir: 'resource/ui/components',
		},
	},
};
```

`ui.sourceDir` contains `.kui.xml` documents. The build always generates the
runtime theme manifest at `resource/default.thm.json`; it is not an authored
input. `ui.namespaces` can map additional XML prefixes to project barrel files.

The HTML template must contain these placeholders:

- `{{KUROT_IMPORT_MAP}}`
- `{{KUROT_STAGE_WIDTH}}`
- `{{KUROT_STAGE_HEIGHT}}`
- `{{KUROT_SCALE_MODE}}`
- `{{KUROT_ORIENTATION}}`
- `{{KUROT_FRAME_RATE}}`
- `{{KUROT_ENTRY_SCRIPT}}`

## KUI XML compilation

KUI XML is the authored Skin format. A Skin root declares its generated class
name and, when needed, its state names. The Skin itself is the visual root
container, so size and layout properties belong on `<Skin>` and visual nodes
are direct children:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin" states="up,down,disabled"
      minWidth="100" minHeight="50">
    <Rect fillColor="#315A9D" fillColor.down="#244474" alpha.disabled="0.5" />
    <Label id="labelDisplay" horizontalCenter="0" verticalCenter="0" />
</Skin>
```

Only nodes exposed as runtime skin parts need an `id`. State-specific values
use `property.state` on the affected node, so internal graphics remain unnamed.
Image sources use their resource key directly, for example
`source="button_up_png"`.

Version 3.2.1 uses `@kurot/ui-document@^0.10.0` and retains its literal-string XML rules.
For example, `<Label text="100.80" text.down="false" size="48" />` compiles
the exact strings `100.80` and `false`, while the font size stays numeric.
String properties no longer add or remove backslash type escapes. Remove old
synthetic prefixes such as the one in `text="\100.80"` explicitly; real
backslashes remain text. XML entities and typed collection data retain their
existing rules. Source files are not migrated automatically. Editor and CLI
must adopt the same [XML value contract](../ui-document/docs/kui-xml.md#values).

The pipeline is:

```text
.kui.xml → UIDocument → SkinIR → ESM skin factory → theme bundle
```

The build derives default skin mappings from built-in component conventions and
configured project component pairs. The build writes `default.thm.json` with
those mappings and the generated `skinsJs` module path. Duplicate conventional
mappings are errors. Unknown tags are warnings in normal development and errors
under strict or release builds.

Successful compilation also writes `.kurot/skin-parts.d.ts`. Every identified
node inside the Skin is inferred as a skin part; its `id` is the part
name. The declaration augments the UI runtime with those exact names and types.
This file is editor-only, ignored by git, and never enters browser bundles.

## Reusable components

Convention-based reusable components pair:

```text
src/components/<path>/<Name>.ts
resource/ui/components/<path>/<Name>Skin.kui.xml
```

The TypeScript module must export `<Name>`. The paired skin declares its generated
class with `class`, for example `class="skins.ActionCardSkin"`; the source/skin
pair supplies the host association. The CLI exposes the component as `<namespace>:<Name>` in
KUI XML, refreshes the namespace bundle, and emits development catalog data at
`.kurot/component-catalog.json`.

Use `onSkinReady()` for logic that needs skin parts and `onSkinRemoved()` for
cleanup before a skin replacement. Access generated parts through
`this.skinParts`.

## Generated project shape

```text
my-game/
├── .kurot/skin-parts.d.ts
├── kurot.config.ts
├── resource/
│   ├── default.res.json
│   ├── config/
│   │   ├── style.json
│   │   └── locale.json
│   ├── lang/lang_en_US.properties
│   ├── assets/fonts/
│   │   ├── ChakraPetch-Regular.ttf
│   │   ├── ChakraPetch-Bold.ttf
│   │   └── OFL.txt
│   └── ui/
│       ├── app/
│       ├── components/
│       └── skins/*.kui.xml
├── src/
│   ├── components/
│   ├── Preloader.ts
│   ├── StyleManager.ts
│   ├── LocaleManager.ts
│   └── Main.ts
└── template/web/index.html
```

StyleManager uses the same ui-document stylesheet parser as the compiler/Editor.
`style.json` is read directly, independently of the manifest; locale.json and
enabled properties files are registered in `preload`. Replace fonts by changing
the resource-relative files/paths, and add languages through the Editor.
See [game template setup](docs/game-template.md) for lifecycle and fallback rules.

## Resource defaults in 3.0.0

KUI builds validate `resource/default.res.json` and inherit image or sheet-frame
`scale9grid` values into compiled `Image.scale9Grid` when XML does not set one.
Local grids and `scale9Grid="false"` take priority. Development mode rebuilds
skins after manifest edits; a malformed manifest leaves the last good Skin
bundle in place. The current CLI requires `@kurot/ui-document@^0.10.0`.

Sheet `subkeys` must be an object-valued frame map. Refresh old sheets in the
Editor before upgrading a KUI project; string-valued subkeys now fail the build.
See the [resource nine-slice contract](../ui-document/docs/resource-nine-slice.md).

## Project style colors in 3.2.0

The optional fixed `resource/config/style.json` is independent of
`default.res.json`. Each KUI build reads it with ui-document 0.10.x, validates
font definitions and the optional named `colors` palette, and resolves color
references before generating Skin factories:

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin" states="disabled">
    <Label id="labelDisplay" textColor="#FF9900"
           textColor.disabled="@style:colors:disabled-text" />
</Skin>
```

`@style:colors:disabled-text` selects the `disabled-text` RGB entry in the
`colors` section. Base and inactive-state references compile to numeric values;
the authored XML remains unchanged. The dev resource watcher observes style.json
and rebuilds skins after changes. Invalid configuration or a missing referenced
color fails with diagnostics and retains the last successful Skin bundle.

An absent stylesheet is allowed when no Skin references its colors. An existing
stylesheet must contain valid font definitions even if the build only consumes
colors; see the shared [project style contract](../ui-document/docs/project-styles.md).
The CLI does not load fonts, apply runtime CSS or introduce live game theme
switching. CLI-built skins run directly through `@kurot/ui`; `@kurot/ui-runtime`
is not required for this compilation path. Node.js >= 20 and semantic format
version 2 remain unchanged.

The previous `@token:color:<key>` XML prefix is rejected by ui-document 0.10.
Update those references explicitly before adopting CLI 3.2; ordinary text stays
literal. Existing EXML projects remain on CLI 1.3.x. No Core/UI rendering change
is required for color expansion.
