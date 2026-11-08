# @kurot/cli

Build-time KUI XML → ESM Skin compilation, game scaffolding and development
resource watching. Package version: **5.0.0** (prepared for publication).
Requires Node.js >= 22.12.0 (develop and test on 22.x) and
ui-document **^0.14.0**; games supply their own Core/UI runtime packages.
UI 4 supplies direct part-field binding; TypeScript powers CLI-side contract checks.

For UI production use the installed UI [authoring guide](../ui/docs/ui-authoring.md)
and [ScoreHUD recipe](../ui/docs/recipes/score-hud.md). Legacy EXML projects use
the separate CLI 1.3.x line. KUI configuration and resource files are project-owned.

## Typed list Skin fields

CLI 4.1.1 supports UI **4.2.x and 5.x** typed native list fields such as
`declare items: List<ItemData | null>` without changing KUI syntax. It preserves
control identity, inheritance and non-data generic checks; see
[field checks](docs/skin-part-fields.md#typed-list-fields). Existing UI 4.0/4.1
projects can keep their current runtime packages when not adopting typed lists.

## RichLabel component typography

RichLabel supports component fontFamily, size, textColor, stroke, strokeColor,
bold and italic. Omitted Span fields follow the component; explicit local values
remain fixed. Raw textFlow snapshots stay unchanged. Scalar KUI state overrides
restore independently. The feature uses UI 4.1, document 0.14 and CLI 4.1;
semantic materialization uses runtime 0.11. See the
[shared text contract](../ui-document/docs/text-components.md).

## Usage

When migrating from CLI 4.x, update to the latest Node 22.x first, then explicitly change the CLI dependency to 5.x and reinstall. The existing TypeScript config, KUI files and game SDK dependencies can stay as they are.

The CLI does not require a global install. Install it as a project development
dependency. New scaffolds resolve current SDK versions from npm and fall back to
latest when lookup fails. The game template uses Core 3 and Game 3's callback
API. Existing projects keep their own
installed SDKs and resources.

```bash
npx @kurot/cli@5.0.0 create my-game
cd my-game
pnpm install
pnpm dev
```

Scaffolded projects expose `build`, `dev`, and `clean` scripts. For an
Editor-managed KUI XML project, install the package with
`pnpm add -D @kurot/cli@^5.0.0`. Existing EXML projects should keep their current
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

Both templates include README/AGENTS entries for commands, authored/generated
files and installed SDK guides. The game template supplies rounded 2× KUI skins,
project fonts/colors/translations and a mascot splash with reduced-motion support.
The 2× skin kit needs Core >= 2.5.0 within 2.x. Existing project files remain
project-owned. See [template startup](docs/game-template.md) and
[default UI skins](docs/default-ui-skins.md).

### `kurot build`

```bash
kurot build [--release] [--sourcemap] [--watch] [--analyze]
            [--strict] [--diagnostics human|json]
```

Development output is written to `bin-debug/`. Release output is written to
`bin-release/web/<timestamp>/` with minified, content-hashed files. Engine,
project namespace, theme, and application code are separate ESM chunks joined
by the generated HTML import map.

CLI >= 3.8.1 within 3.x with Core >= 2.7.0 within 2.x uses
`output: { dir: 'bin-debug', versionedAssets: true }` to append the release build
number to local resources as `?v=<timestamp>`. JS keeps its existing content-hashed
filename and `js/` path. New starters enable the option explicitly; development
output is unchanged. See [release resources and deployment](docs/release-assets.md)
for matching Core support, native font/fetch/Theme calls and cache settings.

Asset copying omits empty runtime directory trees. With KUI enabled, authored
`.kui.xml` files are compiled into the theme chunk and excluded from `resource/`;
skin-only directories such as `resource/ui` therefore do not appear in output.
Images, JSON and other runtime files inside those directories are still copied.
The generated `resource/default.thm.json` remains available to theme loading.

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

Root `kurot.config.ts` / `.js` stage edits are reloaded and published to HTML
without restarting dev. Wait for the successful update, then refresh manually.
Invalid edits retain the last valid page; structural build configuration and
imported configuration helper changes still require restarting dev. Configuration
watching requires CLI >= 3.8.0 within 3.x and applies to `kurot dev`;
`kurot build --watch` keeps its existing source-watch behavior.

Dev also synchronizes the complete `resource/` tree,
including locale JSON, atlas PNG/JSON, fonts and translation files, with deletion
and rename handling. Runtime-only edits do not recompile skins; style and resource
default changes still do. Refresh after synchronization succeeds. No atlas
directory configuration is needed. See [resource watching](docs/dev-resource-watching.md)
for batching, cache headers and the limits of multi-file updates.

### `kurot clean`

Removes the configured development output and `bin-release`. Output paths must be real directories strictly inside the project; paths through symlinks and paths overlapping project inputs are rejected before cleanup.

## Configuration

The CLI loads `kurot.config.ts` on Node.js 22.12.0 and later, including relative TypeScript
helpers. Generated projects need no loader flags or extra dependencies. If both
files exist, TypeScript takes precedence over `kurot.config.js`; JavaScript
configuration continues to use the native Node loader.

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

`ui.skinRegistration` accepts `'global'` (the default) or `'module'`. Both modes
export a frozen `skinFactories` map keyed by complete Skin class names. Global
mode also registers factories on `globalThis` for the existing Theme loader.
Module mode leaves registration to the application:

```ts
ui: {
	sourceDir: 'resource/ui',
	skinRegistration: 'module',
},
```

Load `resource/default.thm.json`, resolve its `skinsJs` relative to that JSON URL,
and dynamically import `skinFactories`. This also locates the hashed release
module; avoid hardcoding `default.thm.js`. Use the JSON's `skins` as local default
mappings. See [module skins](docs/module-skins.md) for a complete UIContext loader
and resource/lifecycle ownership. Use UI 4 for the current field-binding and
UIContext workflow. Changing registration during dev requires restarting
the dev server.

`stage` supplies the generated canvas defaults. With Core >= 2.6.0 within 2.x,
entry code can use `createPlayer({ canvas })`. Explicit options override the corresponding defaults;
see [Core stage configuration](../core/docs/stage-configuration.md).

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

The CLI uses `@kurot/ui-document@^0.14.0` and its literal-string XML rules.
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

Views declare fields such as `declare btnClose: Button` and use `this.btnClose`.
The CLI validates required, optional and inherited parts, node types and host
member collisions. It also rejects emitted fields that could overwrite a binding.
Generated metadata retains the framework part map without adding business fields.
See [declared field checks](docs/skin-part-fields.md).
After changing authored Skin inputs or declarations, rebuild and run
`tsc --noEmit --skipLibCheck false`. Edit authored inputs rather than generated
`.kurot/` files. Runtime Skin factories are separate from editor declarations.

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
cleanup before a skin replacement. Declare fields on the view and access them
directly; a Presenter or view-specific helper receives that concrete view.

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

## Resource defaults

KUI builds validate `resource/default.res.json` and inherit image or sheet-frame
`scale9grid` values into compiled `Image.scale9Grid` when XML does not set one.
Local grids and `scale9Grid="false"` take priority. Development mode rebuilds
skins after manifest edits; a malformed manifest leaves the last good Skin
bundle in place. The current CLI requires `@kurot/ui-document@^0.14.0`.

Sheet `subkeys` must be an object-valued frame map. Refresh old sheets in the
Editor before upgrading a KUI project; string-valued subkeys now fail the build.
See the [resource nine-slice contract](../ui-document/docs/resource-nine-slice.md).

## Project style colors

The optional fixed `resource/config/style.json` is independent of
`default.res.json`. Each KUI build reads it through the shared document kernel, validates
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
is not required for this compilation path. The semantic document format remains version 2.

Only `@style:colors:<key>` is accepted for authored palette references.
Ordinary text remains literal; color expansion changes compiled copies only.

## Label presets

The compiler expands `textStyle="@style:labels:<key>"` through the shared
`style.json.labels` contract before generating native Label properties. Local and
state fields win; authoring references remain in XML. Development watches the
stylesheet and retains the last good bundle on errors. Programmatic `compileKUI`
accepts `styleSheet: parseUIStyleSheet(config)`. No Core/UI renderer change is needed.

Select a preset only in Default; named states override individual fields rather
than selecting a different preset. Missing presets, unsupported selection or
invalid configuration fail explicitly. Expansion runs after resource defaults
and before color resolution. It does not load fonts or measure text.

See [the shared contract](../ui-document/docs/project-styles.md).
