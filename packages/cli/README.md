# @kurot/cli

Build tooling for the Kurot UI Editor workflow. It uses esbuild, emits ES2022
ESM, and compiles canonical KUI XML skins into runtime theme modules.

> **Current release: 2.0.2.** Node.js 20 or later is required.

> **Release scope:** The 2.0.x line is currently dedicated to Kurot Editor integration.
> Existing game projects that use EXML, including CrashMaster, should remain on
> `@kurot/cli@1.3.x`. Version 2.0.x is not an in-place project upgrade and does
> not require those projects to change their configuration or UI assets.

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Usage

The CLI does not require a global install.

```bash
npx @kurot/cli create my-game
cd my-game
pnpm install
pnpm dev
```

Scaffolded projects expose `build`, `dev`, and `clean` scripts. For an
Editor-managed KUI XML project, install the package with
`pnpm add -D @kurot/cli@2`. Existing EXML projects should keep their current
1.3.x dependency.

## Commands

### `kurot create`

```bash
kurot create <name> [--template game|empty]
```

The `game` template includes `@kurot/core`, `@kurot/game`, `@kurot/ui`, KUI
skins, resource loading, and an editable HTML template. The `empty` template
contains a minimal `Sprite` application.

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

The TypeScript module must export `<Name>`. The paired skin must target
`<namespace>.<Name>`. The CLI exposes the component as `<namespace>:<Name>` in
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
│   ├── assets/
│   └── ui/
│       ├── components/
│       └── skins/*.kui.xml
├── src/
│   ├── components/
│   ├── LoadingUI.ts
│   └── Main.ts
└── template/web/index.html
```
