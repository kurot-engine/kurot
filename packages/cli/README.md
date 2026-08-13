# @kurot/cli

CLI tool for the Kurot game engine — a modern replacement for the legacy Egret CLI. Powered by esbuild for fast compilation, with a built-in EXML skin parser and code generator.

> Migrating from Egret? See [egret-migration.md](../../docs/egret-migration.md)
>
> Release history: [CHANGELOG.md](CHANGELOG.md)

## Usage

`@kurot/cli` does **not** require a global install.

### Creating a project

Use `npx` to scaffold a new project — no installation needed:

```bash
npx @kurot/cli create my-game
npx @kurot/cli create my-lib --template empty
```

### In-project commands

Scaffolded projects include `@kurot/cli` as a devDependency and expose commands via npm scripts:

```bash
cd my-game
pnpm install
pnpm build    # build
pnpm dev      # dev server
pnpm clean    # clean output
```

You can also add it to an existing project manually:

```bash
pnpm add -D @kurot/cli
```

## Commands

### `kurot create`

Scaffold a new project from a template.

```bash
kurot create <name> [options]
```

| Option                  | Description                 | Default |
| ----------------------- | --------------------------- | ------- |
| `--template <template>` | Template: `game` \| `empty` | `game`  |

**Templates:**

| Template | Extends   | Dependencies                                      | Description                                                                      |
| -------- | --------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `game`   | `UILayer` | `@kurot/core` + `@kurot/game` + `@kurot/ui` | Full-featured project with resource loading, scene building, and Tween animation |
| `empty`  | `Sprite`  | `@kurot/core`                                   | Minimal project — pure Canvas rendering, no extra dependencies                   |

**Lifecycle:**

| Template | Entry class            | Lifecycle                                                                                         |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `game`   | `Main extends UILayer` | `createChildren` → `runGame` → `loadResource` → `loadTheme` → `createGameScene` → `startAnimation` |
| `empty`  | `Main extends Sprite`  | constructor → `ADDED_TO_STAGE` → `onAddToStage`                                           |

### `kurot build`

Compile the project into ESM application, engine, namespace, and theme bundles.

```bash
kurot build [options]
```

| Option                   | Description                                            | Default |
| ------------------------ | ------------------------------------------------------ | ------- |
| `-r, --release`          | Minified, content-hashed release build (→ bin-release) | `false` |
| `--sourcemap`            | Generate sourcemaps                                    | `false` |
| `--watch`                | Rebuild source on file changes                         | `false` |
| `--analyze`              | Print bundle size analysis (esbuild metafile)          | `false` |
| `--strict`               | Promote supported warnings to build errors             | `false` |
| `--diagnostics <format>` | Diagnostic output: `human` or `json`                   | `human` |

`--diagnostics json` writes exactly one JSON result to stdout. It includes
`success`, `mode`, `durationMs`, the output directory on success, and all
structured diagnostics. Release builds use strict diagnostic policy by default.

```bash
kurot build --strict --diagnostics json
```

**Output (Egret-aligned shape, ESM under the hood):**

| Mode           | Layout                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| development    | `bin-debug/` — per-file `.js` mirroring `src/` (`Main.js`, `com/.../X.js`) + engine chunks in `js/`       |
| release (`-r`) | `bin-release/web/<timestamp>/` — `js/main.min_<hash>.js` + `js/kurot.*.min_<hash>.js` + `manifest.json` |

Engine packages (`@kurot/*`) are bundled into separate `js/kurot.<name>.js`
chunks and wired up through an HTML **import map**, so the app bundle and engine
resolve bare specifiers (`import { Sprite } from '@kurot/core'`) in the browser
without duplicating engine code. `resource/` (including the compiled
`default.thm.json`) is copied with fixed names, since user code references those
paths directly. The entry script bootstraps via your own `createPlayer()` call.

### `kurot dev`

Start a development server with auto-recompilation on file changes (manual browser refresh required).

```bash
kurot dev [options]
```

| Option                   | Description                                | Default |
| ------------------------ | ------------------------------------------ | ------- |
| `-p, --port <port>`      | Port to listen                             | `3000`  |
| `--sourcemap`            | Generate sourcemaps                        | `false` |
| `--strict`               | Promote supported warnings to build errors | `false` |
| `--diagnostics <format>` | Diagnostic output: `human` or `jsonl`      | `human` |

Unlike build's single JSON result, `kurot dev --diagnostics jsonl` writes one
JSON event per line so an agent can follow initial builds, diagnostics,
rebuilds, and server readiness incrementally.

```bash
kurot dev --strict --diagnostics jsonl
```

Machine-readable modes reserve stdout for their JSON protocol and never include
ANSI color sequences. Failures set a non-zero process exit code.

### `kurot clean`

Remove the build output directories (`bin-debug` and `bin-release`).

```bash
kurot clean
```

## Configuration

Create a `kurot.config.ts` in your project root:

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
	// Optional: enable EXML skin compilation
	exml: {
		themeFile: 'resource/default.thm.json',
		// Optional: map a custom EXML prefix to a source barrel file
		namespaces: {
			game: 'src/ui/index.ts',
		},
	},
};
```

**Options:**

| Field               | Type     | Description                                                                                                              |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `target`            | `string` | Build target — currently only `'html5'`                                                                                  |
| `entry`             | `string` | Entry file path, default `'src/Main.ts'`                                                                                 |
| `output.dir`        | `string` | Output directory, default `'bin-debug'`                                                                                  |
| `html.template`     | `string` | Optional project-owned HTML template; the CLI default page is used when omitted                                          |
| `stage.width`       | `number` | Stage width                                                                                                              |
| `stage.height`      | `number` | Stage height                                                                                                             |
| `stage.scaleMode`   | `string` | Scale mode: `showAll` / `noScale` / `exactFit` / `noBorder` / `fixedHeight` / `fixedWidth` / `fixedNarrow` / `fixedWide` |
| `stage.orientation` | `string` | Orientation: `auto` / `portrait` / `landscape`                                                                           |
| `stage.frameRate`   | `number` | Frame rate — must be a positive integer                                                                                  |
| `exml.themeFile`    | `string` | Theme JSON file path                                                                                                     |
| `exml.namespaces`   | `Record<string, string>` | Optional EXML prefix → source barrel-file mapping                                                          |

## HTML Template

New projects include an editable `template/web/index.html`. The build reads
this file and writes the rendered page to the active output directory. Existing
projects that do not configure `html.template` continue to use the CLI's
built-in default page.

The following placeholders are required in a configured project template:

| Placeholder | Generated value |
| --- | --- |
| `{{KUROT_IMPORT_MAP}}` | Engine and custom namespace import map |
| `{{KUROT_STAGE_WIDTH}}` | Configured stage width |
| `{{KUROT_STAGE_HEIGHT}}` | Configured stage height |
| `{{KUROT_SCALE_MODE}}` | Configured scale mode |
| `{{KUROT_ORIENTATION}}` | Configured orientation |
| `{{KUROT_FRAME_RATE}}` | Configured frame rate |
| `{{KUROT_ENTRY_SCRIPT}}` | Compiled application entry script |

The template may otherwise contain any project-specific HTML, styles, loading
screen, platform SDK, analytics, fonts, or additional containers. A build fails
with a clear error when a configured template is missing a required placeholder.

## EXML Skin Compiler

The CLI includes a complete EXML skin parsing and code generation pipeline (XML → SkinIR → ESM JavaScript). `.exml` files placed in the `resource/` directory are compiled automatically during `kurot build`.

### Features

- **XML Parsing** — lightweight parser with namespace, CDATA, and comment support
- **AST / IR Generation** — converts to an intermediate representation (SkinIR)
- **Code Generation** — outputs ESM factory functions
- **Component Registry** — built-in `eui:*` / `egret:*` namespace mapping to `@kurot/ui` / `@kurot/core`
- **Custom Namespaces** — maps project prefixes such as `game:*` to source barrel files through `exml.namespaces`
- **View States** — supports `<eui:states>`, shorthand `states="up,down"`, state properties, `includeIn`, and `excludeFrom`
- **Skin Properties** — preserves root properties such as `minWidth`, `minHeight`, and state-specific values
- **Percent Layout** — auto-detects `width="100%"` and converts to `percentWidth`
- **Data Binding** — parses `{expression}` binding syntax and generates `Binding.bindProperty` calls
- **Structured Diagnostics** — stable codes, source locations, suggestions, and strict warning promotion

Unknown tags remain warnings in normal development builds and are omitted from
the generated visual tree. Under `--strict` (and in release builds), those
warnings become errors. Syntax errors, invalid theme JSON, and other genuine
Skin compilation failures always stop the build; the compiler never substitutes
an empty Skin factory.

The standard declarations `xmlns:eui="http://ns.egret.com/eui"` and
`xmlns:egret="http://ns.egret.com/egret"` are namespace identifiers. The CLI
resolves their prefixes internally and does not access those URLs over the
network, so the original Egret namespace pages do not need to be hosted.

### Custom component lifecycle

For initialization that requires every EXML skin part to be available, override
`childrenCreated()`:

```ts
import { Component } from '@kurot/ui';

export class BattlePanel extends Component {
	protected override childrenCreated(): void {
		super.childrenCreated();
		// imgBg, imgFrame, groupField, and other skin parts are now bound.
	}
}
```

The event-based equivalent is useful when initialization is composed externally:

```ts
import { UIEvent } from '@kurot/ui';

this.once(UIEvent.CREATION_COMPLETE, this.onCreationComplete);
```

Use `partAdded()` and `partRemoved()` only when logic must follow an individual
skin part across skin replacements. `childrenCreated()` and
`UIEvent.CREATION_COMPLETE` run once for the component's initial creation.

EXML skins compiled by the CLI are registered under their complete `class`
attribute, so an Egret-style value such as
`skinName = "game.ui.BattlePanelSkin"` works when that EXML is included in the
loaded theme bundle. A component covered by the theme's `skins` mapping normally
does not need to assign `skinName` itself. Hand-written `Skin` subclasses may be
imported and assigned directly instead of using a string.

### Compilation Pipeline

All `.exml` skins compile into a single ESM module — `js/default.thm.js` (dev)
or `js/default.thm.min_<hash>.js` (release) — that registers each skin factory.
`default.thm.json` keeps only the component→skin mapping plus a `skinsJs`
pointer to that module, which the runtime `Theme` imports. No `.exml` is shipped.

```
resource/skins/*.exml
        ↓ parseXML()
    XML Element Tree
        ↓ parseEXML()
       SkinIR
        ↓ generateCode({ format: 'esm' })
    per-skin ESM factories
        ↓ esbuild bundle (+ minify in release)
    js/default.thm[.min_<hash>].js   (skins register on globalThis)
```

## Project Structure

A project created with the default template (`game`) has the following structure:

```
my-game/
├── kurot.config.ts          # Project config (includes exml options)
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript config
├── template/
│   └── web/
│       └── index.html            # Editable output page template
├── resource/
│   ├── default.res.json       # Resource config
│   ├── default.thm.json       # Theme file: component → skin mapping
│   └── skins/                 # EXML skin directory (21 default skins)
│       ├── ButtonSkin.exml
│       ├── ...
│       └── ViewStackSkin.exml
└── src/
    ├── Main.ts                # Entry: class Main extends Sprite
    └── LoadingUI.ts           # Loading progress display
```

## Quick Start

```bash
# Full-featured game project (default)
npx @kurot/cli create my-game
cd my-game && pnpm install
pnpm dev

# Minimal project
npx @kurot/cli create my-lib --template empty
cd my-lib && pnpm install
pnpm dev
```
