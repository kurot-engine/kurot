# Kurot

Kurot is a TypeScript, ESM and ES2022 2D web game engine with a retained
display tree, WebGL rendering, events and native skinnable UI.

For game work, read the [game guide](packages/core/docs/game-authoring.md),
[standard UI authoring](packages/ui/docs/ui-authoring.md) and
[API documentation index](docs/api-documentation.md). The
[Star Catcher example](examples/star-catcher/README.md) demonstrates a complete
game; the [ScoreHUD recipe](packages/ui/docs/recipes/score-hud.md) demonstrates
UI behavior, typed Skin parts and caller-owned cleanup.

## Packages and dependencies

The table records source manifest versions. Consumer projects use their own
installed SDK versions and locks. Packages release independently, and the root
has no unified workspace install/build command.

| Package                                                | Version | Path                   | Responsibility                                                                                                   | Internal dependencies       |
| ------------------------------------------------------ | ------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------- |
| [`@kurot/core`](packages/core/README.md)               | 3.2.3   | `packages/core`        | Core engine capabilities: display objects, rendering, events, geometry, text, resources, networking, and media   | `@kurot/bitmap-font`        |
| [`@kurot/ui`](packages/ui/README.md)                   | 5.1.2   | `packages/ui`          | Skinnable UI components, typed lists and part fields, layout, theming, and data binding                         | `@kurot/core`               |
| [`@kurot/game`](packages/game/README.md)               | 3.0.1   | `packages/game`        | Game extensions: Tween, MovieClip, ScrollView, URLLoader, etc.                                                   | `@kurot/core`               |
| [`@kurot/cli`](packages/cli/README.md)                 | 5.0.0   | `packages/cli`         | KUI XML compilation, declared-part validation and project tooling; EXML projects use CLI 1.3.x                   | `ui-document`               |
| [`@kurot/ui-document`](packages/ui-document/README.md) | 0.14.0  | `packages/ui-document` | Headless UI assets, component capabilities, reuse, typed contracts, validation, transactions, diffs, and history | None                        |
| [`@kurot/ui-runtime`](packages/ui-runtime/README.md)   | 0.13.0   | `packages/ui-runtime`  | Materializes semantic assets with transactional bindings, actions, transitions, resources, and component reuse   | `core`, `ui`, `ui-document` |
| [`@kurot/atlas`](packages/atlas/README.md)             | 0.1.1   | `packages/atlas`       | Published independent RGBA atlas packing and Node PNG tooling                                                    | None                        |
| [`@kurot/dragonbones`](packages/dragonbones/README.md) | 0.2.0   | `packages/dragonbones` | DragonBones 5.7 runtime, native displays, atlas regions, deformable meshes, events and clock           | `@kurot/core`               |
| [`@kurot/bitmap-font`](packages/bitmap-font/README.md) | 0.1.0   | `packages/bitmap-font` | Published headless font data, parsing, validation, serialization and layout                                      | None                        |

Core depends on bitmap-font. UI, Game and DragonBones use Core peers; CLI is
build-time tooling over ui-document. ui-runtime materializes semantic documents
through Core/UI, while ordinary CLI-built skins run directly through UI.
Spine adapters live in the separate Kurot-Spine repository.

Current manifest dependency ranges:

| Consumer          | Required Kurot packages                           |
| ----------------- | ------------------------------------------------- |
| Core 3.2.3        | bitmap-font `^0.1.0`                              |
| UI 5.1.2         | Core `^3.2.1`                                     |
| Game 3.0.1        | Core `^3.0.0`                                     |
| CLI 5.0.0         | ui-document `^0.14.0`                             |
| ui-runtime 0.13.0 | Core `^3.0.0`, UI `^5.0.0`, ui-document `^0.14.0` |
| dragonbones 0.2.0 | Core `^3.0.0`                                     |

See the [dependency policy](docs/dependency-policy.md) for compatibility and
explicit installation updates. Package changes and publication/adoption records
belong in CHANGELOG.md.

UI 4 binds named Skin parts directly to declared host fields; CLI 4 checks their
types and ownership contracts. See [part fields](packages/ui/docs/skin-part-fields.md).
RichLabel component typography is available in UI 4.1, document 0.14, CLI 4.1
and runtime 0.11. See [RichLabel](packages/ui/docs/rich-label.md). CLI-built skins
use UI directly; existing applications keep their own installed versions.

UI 4.2 adds item-data generics through collections, lists and item-tap events.
Declared typed list fields in KUI hosts require CLI 4.1.1 or later; ordinary
TypeScript use needs only UI 4.2. See [typed list data](packages/ui/docs/list-data-types.md).

Core 3.2 adds native `BackdropBlur`. It samples
earlier pixels in the active compositing layer while keeping later foreground
sharp. See [background blur](packages/core/docs/backdrop-blur.md). UI 5.1 adds
a [Backdrop wrapper](packages/ui/docs/backdrop.md) with normal layout. Follow
the current package peer ranges above; consumer adoption remains separate.

Core 3.1.0 adds `Texture.hitTestAlpha(x, y)`
for original texture alpha, with shared sampling storage, atlas/density handling
and exception cleanup. See [texture alpha testing](packages/core/docs/texture-density.md#texture-alpha-testing).
It also removes the unsupported base `Texture.getPixel32()` declaration as an
explicit minor-release type compatibility exception; the real
`RenderTexture.getPixel32()` capture API remains available.

Core 3.2.2 and UI 5.1.2 are published on npm with text-ink protection,
reachable mixed-size scroll tails and more compact Label outline insets. Stable
font frames and baselines are preserved. UI's Core peer remains ^3.2.1; use
Core 3.2.2 to include the accompanying Core corrections. See the package
CHANGELOGs for release details and validation.
Core 3.2.3, Game 3.0.1, CLI 4.1.3, Atlas 0.1.1 and ui-runtime 0.13.0 are published; their package tags point to the verified release source. DragonBones 0.2.0 is also published. CLI 5.0.0 is prepared for publication. It requires Node.js 22.12.0 or later and loads TypeScript project configs without an external loader. Existing projects on CLI 4.x opt in explicitly; browser SDK versions do not change.
Game, DragonBones and ui-runtime retain Core ^3.0.0 peers. ui-runtime also
requires UI ^5.0.0. Callback receiver parameters and unsupported
Texture methods have been removed. See [ticker ownership](packages/core/docs/ticker.md),
[UI callbacks](packages/ui/docs/callbacks.md) and [Tween callbacks](packages/game/docs/tween-callbacks.md).
Spine 4.0/4.1/4.2 adapters 0.3.0 and Spine 4.3 adapter 0.4.0 are published
for the same Core 3 line.

## Getting started

### Requirements

- Node.js 22.x for development and CI (minimum 22.12.0); run `nvm use` from this repository
- pnpm 10.33.0
- A modern browser environment with ES2022 and ESM support

### Installing, building, and testing a single package

Every package installs its dependencies independently. The following example uses the core package:

```sh
pnpm --dir packages/core install
pnpm --dir packages/core build
pnpm --dir packages/core test
```

Replace `core` with `cli`, `ui`, `game`, `ui-document`, `ui-runtime`, `atlas`, `dragonbones`, or `bitmap-font` to install and build the corresponding package:

```sh
pnpm --dir packages/<package> install
pnpm --dir packages/<package> build
```

All nine packages provide a one-shot test command:

```sh
pnpm --dir packages/<package> test
```

Every package supports a TypeScript compile-watch command:

```sh
pnpm --dir packages/<package> dev
```

### Using the local CLI

Without publishing a package, you can invoke the CLI's source entry point directly:

```sh
pnpm --dir packages/cli kurot -- <command>
```

The CLI supports project creation, building, a dev server, and cleanup through
the `kurot` command and `kurot.config.ts` project configuration.

## Architecture overview

The ownership and dependency boundaries of the semantic UI stack are recorded
in [`UI-ARCHITECTURE.md`](UI-ARCHITECTURE.md).

### Rendering pipeline

`@kurot/core` uses a two-phase rendering approach:

1. **Build**: walks the scene graph and produces a flat `InstructionSet`, rather than recursively processing a RenderNode tree.
2. **Execute**: dispatches instructions to the corresponding `RenderPipe` by `renderPipeId` to perform the actual drawing.

This design separates scene structure changes from render data updates: `structureDirty` triggers instruction set rebuilds, while `renderDirty` triggers partial data updates. The WebGL backend supports multi-texture batching; when WebGL is unavailable, it falls back to the Canvas 2D backend.

### Renderer comparison

Use Core's [benchmark harness](packages/core/examples/benchmark) for repeatable
Kurot/PixiJS/Egret comparisons. UI's [benchmark harness](packages/ui/examples/benchmark)
measures native UI scenarios. Performance depends on the browser, scene and
rendering path; run the relevant harness for the workload being evaluated.

### KUI XML and EUI

CLI 3.x is scoped to the Kurot Editor workflow. Existing EXML game
projects continue to use CLI 1.3.x and do not need to migrate their project
configuration or UI assets.

`@kurot/ui-document` defines canonical `.kui.xml` for authored Skin documents;
screen and reusable-component documents remain programmatic semantic models.
`@kurot/cli` parses Skin XML at build time and turns it into ESM factories
loaded by `@kurot/ui`'s theme system. Default skin mappings are derived from
built-in and project component naming conventions. Project component prefixes
are mapped through `ui.namespaces` or discovered through `ui.components` in
`kurot.config.ts`.

## Examples

- [`examples/star-catcher`](examples/star-catcher/README.md): a complete Core-only game with keyboard/touch input, score, game over, restart, cleanup and one-command development/release verification. Start with the [game-authoring quick guide](packages/core/docs/game-authoring.md).
- [`examples/demo`](examples/demo/): a minimal CLI-built rendering and engine integration example.
- [`examples/game`](examples/game/): a CLI-built game project example with KUI XML skins.

## Repository layout

```text
Kurot/
├── AGENTS.md       Context index for AI agents / contributors — read this first
├── packages/       Independently published engine packages and CLI
├── examples/       Demo and generated project examples
├── docs/           Contribution rules — committed
├── tools/          Private repository tooling and Agent evaluations
├── reference/      Local read-only reference sources
├── UI-ARCHITECTURE.md  Semantic UI authoring architecture
├── .gitignore      Shared version-control ignore rules
└── README.md
```

Each package (and the repo root) additionally has a `docs/` and a
`docs-internal/` folder: `docs/` is committed and distributed with the
package — architecture notes, migration guides, and an `ai-context.md` map
for anyone (human or AI) getting oriented in that package. `docs-internal/`
holds design drafts, code reviews, and audits that record _why_ a decision
was made; it's excluded by `.gitignore` and stays local. Build outputs and
local editor configuration are excluded the same way. If you obtained the
repository from another source, defer to the actual checked-out contents
rather than assuming `docs-internal/` is present.

## Contribution guidelines

Please read the code rules before submitting changes. The project requires TypeScript, strict type checking, ESM, and ES2022; the application layer uses `undefined` to represent missing values, exported functions must declare return types, and named exports are used consistently.

Run the build and test commands from within the package you changed. Do not assume a unified install, build, or test command exists at the repository root.

### Bitmap fonts

`packages/bitmap-font` provides dependency-free font data and shared layout for
games and editors. Core uses it for FontAnalyzer and BitmapText rendering;
UI provides BitmapLabel for native UI layout.
See [font format](packages/bitmap-font/docs/format.md) and
[Core integration](packages/core/docs/bitmap-fonts.md). KUI/Editor adoption is
separate from these native runtime components.
