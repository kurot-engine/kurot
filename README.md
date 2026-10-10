# Kurot

Kurot is a web-focused 2D game engine: a modern rewrite of the Egret engine built on **TypeScript, ESM, and ES2022**. It preserves the Egret-style display object, event, graphics, and EUI developer experience while adopting an instruction-based rendering architecture: a flat instruction set is built first, then executed by the rendering pipelines.

> Kurot continues Egret 5.4.1's display-object and development model while
> upgrading its rendering core to a WebGL2-first, InstructionSet/RenderPipe,
> multi-texture batching architecture. In the validated mixed-texture, deep
> container, display-list churn, and texture-swap workloads, Kurot substantially
> reduced draw calls. Canvas 2D fallback remains a capability shared by both
> engines.

Core features include:

- Egret-style `DisplayObject`, event, geometry, graphics, resource, and media APIs.
- A **Build → Execute** rendering flow, with WebGL multi-texture batching and RenderGroup layering.
- A WebGL primary rendering backend with a Canvas 2D fallback backend.
- Unicode 17.0 word wrapping, dictionary segmentation, and rich-text input offsets.
- EUI-compatible components, layout, states, data binding, and theming system.
- Canonical KUI XML authoring with build-time Skin compilation and no XML parsing at runtime.
- A headless `kui.*` UI document model and explicit runtime materialization layer
  for future editors and Agent workflows.
- Tween, MovieClip, ScrollView, and URLLoader game extensions.
- DragonBones 5.7 skeletal animation with native display, mesh, event and clock integration.

## From Egret to Kurot

Kurot is a continuation of Egret 5.4.1 for the modern web platform, not a new
API placed on top of the old renderer. It retains the productive display-object,
event and EUI model while replacing the rendering and build foundations.

| Area                | Egret 5.4.1                              | Kurot                                                        |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| GPU backend         | WebGL 1                                  | WebGL 2 preferred, WebGL 1 fallback                          |
| Software fallback   | Canvas 2D                                | Canvas 2D                                                    |
| Batching            | Primarily consecutive same-texture draws | Up to eight textures in one batch                            |
| Render organization | RenderNode tree                          | Flat `InstructionSet` + `RenderPipe` execution               |
| Update model        | RenderNode/display-tree updates          | Separate `structureDirty` rebuilds and `renderDirty` patches |
| Modules             | Namespace/global-oriented runtime        | Native ESM                                                   |
| Language target     | Legacy web/TypeScript environment        | ES2022 with `strict: true`                                   |
| UI documents        | EXML runtime/toolchain model             | Canonical KUI XML → build-time ESM Skin compilation          |

Canvas 2D fallback is a capability shared by both engines; it is not presented
as a Kurot invention. Kurot's measurable renderer evolution is its modern
WebGL2-capable pipeline and multi-texture batching, together with a reproducible
correctness and performance validation system.

## Packages and dependencies

Version audit: 2026-10-10. The table records source manifest versions.
Core 2.5.3 and ui-document 0.13.1 are published, verified on npm on 2026-10-10. TextField,
BitmapText and their UI text components default to middle. Explicit top/bottom
remain effective; multiline controls only line generation. Use explicit top when
content should start at the top of a taller box. Catalog metadata matches the new
Core default without rewriting XML. See [text layout](packages/core/docs/text-layout.md).
Core 2.5.3, document 0.13.1 and CLI 3.6.0 are verified published releases,
including package downloads and registry integrity. Core/default-catalog modules
match the tested local builds. The other six source versions match their recorded
npm releases. Dependency/peer ranges are unchanged. Apps adopt installations/locks and rebuild explicitly; UI and
other compatible SDKs need no version bump. Feature introductions and benchmark
results retain their recorded release versions.

Kurot is composed of several independently maintained pnpm packages. The repository root currently has no `pnpm-workspace.yaml` or unified root-level build script, so install dependencies and run commands from within each package directory.

| Package                                                | Version | Path                   | Responsibility                                                                                                   | Internal dependencies       |
| ------------------------------------------------------ | ------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------- |
| [`@kurot/core`](packages/core/README.md)               | 2.5.3   | `packages/core`        | Core engine capabilities: display objects, rendering, events, geometry, text, resources, networking, and media   | `@kurot/bitmap-font`        |
| [`@kurot/ui`](packages/ui/README.md)                   | 3.4.0   | `packages/ui`          | EUI-compatible UI components, layout, skins, theming, and data binding                                           | `@kurot/core`               |
| [`@kurot/game`](packages/game/README.md)               | 2.0.0   | `packages/game`        | Game extensions: Tween, MovieClip, ScrollView, URLLoader, etc.                                                   | `@kurot/core`               |
| [`@kurot/cli`](packages/cli/README.md)                 | 3.6.0   | `packages/cli`         | Editor-focused KUI XML build tooling; EXML game projects remain on CLI 1.3.x                                     | `ui-document`               |
| [`@kurot/ui-document`](packages/ui-document/README.md) | 0.13.1  | `packages/ui-document` | Headless UI assets, component capabilities, reuse, typed contracts, validation, transactions, diffs, and history | None                        |
| [`@kurot/ui-runtime`](packages/ui-runtime/README.md)   | 0.10.0   | `packages/ui-runtime`  | Materializes semantic assets with transactional bindings, actions, transitions, resources, and component reuse   | `core`, `ui`, `ui-document` |
| [`@kurot/atlas`](packages/atlas/README.md)             | 0.1.0   | `packages/atlas`       | Published independent RGBA atlas packing and Node PNG tooling                                                    | None                        |
| [`@kurot/dragonbones`](packages/dragonbones/README.md) | 0.1.0   | `packages/dragonbones` | Published DragonBones 5.7 runtime, native displays, atlas regions, deformable meshes, events and clock           | `@kurot/core`               |
| [`@kurot/bitmap-font`](packages/bitmap-font/README.md) | 0.1.0   | `packages/bitmap-font` | Published headless font data, parsing, validation, serialization and layout                                      | None                        |

Dependencies flow in one direction: `core` is the foundation package; `ui`, `game` and `dragonbones` depend only on `core` and not on each other. `ui-document` stays headless, while `ui-runtime` is the explicit browser boundary that connects its semantic data to `ui` and `core`. `cli` remains build-time only. Versioned Spine adapters are maintained separately in the `Kurot-Spine` repository.

`@kurot/dragonbones` is maintained in this repository at `packages/dragonbones`.
It requires Core `^2.1.1` and includes official DragonBones TypeScript sources
adapted to ESM under `src/runtime`. Sources compile directly to `dist` with
the adapter. Version 0.1.0 is published and develops against Core 2.2.0 from
npm without local overrides. See its
[usage and lifecycle contracts](packages/dragonbones/README.md).

`@kurot/atlas` is independent build-time tooling, with a portable RGBA entry point
and a separate Node PNG adapter. It has no Core/CLI dependencies and is not yet
connected to Editor, Reskin or CLI. Games consume its PNG/JSON output without
loading the packing library. See [atlas contracts and examples](packages/atlas/README.md).

`@kurot/ui-document` provides the reusable semantic model, explicit component
capabilities, bounded dynamic contracts, and headless editing kernel.
Published `@kurot/ui-runtime` 0.10.0 uses ui-document 0.13.x and renders
component instances, Slots, appearances, states, variants, resources, and
design tokens. It executes transactional one-way data bindings, semantic
actions, numeric appearance transitions, component states, and
category-specific resource adapters while keeping game logic outside the
document.

Core 2.5.0 adds independent texture source density and fixes multilingual text
alignment, fractional WebGL viewport edges and root-target restoration. CLI 3.6.0
adds the rounded native 2× KUI skin kit, mascot brand splash and build fixes.
Both releases are published. New game scaffolds need Core ^2.5.0; existing SDK
peers accept it without new releases. Existing projects update chosen installations
and locks, then rebuild; their own skins and HTML are retained. Editor/Reskin
resource authoring adoption additionally needs density-aware logical dimensions.
See [texture density](packages/core/docs/texture-density.md),
[default KUI skins](packages/cli/docs/default-ui-skins.md) and the
[dependency policy](docs/dependency-policy.md).

Core 2.4.0, UI 3.4.0 and ui-document 0.13.0 are published, verified on npm
on 2026-10-09, with centered display/UI flips and shared authoring metadata.
UI/CLI/runtime development installations and registry locks adopt the relevant
upstream releases. CLI 3.5.0 and ui-runtime 0.10.0 are also published, verified
on npm on the same date. Editor 0.24.0 adopts the complete registry SDK chain.
Read [the feature and adoption contract](docs/centered-flips.md) for targeted lockfile adoption.

UI 3.3.1 is preserved in commit 60e6404, not published. It corrects transformed
percentage/edge allocations for all UI components, including negative scale,
rotation and skew. The correction is included in published UI 3.4.0; consumers
adopt UI 3.4.0 with Core ^2.4.0 and rebuild. Other SDKs need no version bump.

Core 2.3.3 is published. It restores Bitmap/Image repeat
and clip in both backends and bitmap caches; see [fill modes](packages/core/docs/bitmap-fill.md).
UI 3.3.0/runtime 0.9.0 and Game/DragonBones peers accept it without dependent
SDK releases. UI 3.4.0/runtime 0.10.0 require Core ^2.4.0, which includes the
correction. Editor 0.23.2
installs exact registry Core 2.3.3 with a matching Bun lock and uses ordinary builds.

Core 2.3.2 is published with a compatible text-outline fix for
Canvas/WebGL drawing, display-list caches and effect captures. Text measurements,
wrapping, hit areas and external clip boundaries remain unchanged.
UI 3.3.0/runtime 0.9.0 and Game/DragonBones peers accept it; UI 3.4.0/runtime
0.10.0 require Core ^2.4.0, which includes it. Applications update their lock and rebuild
to adopt it. Editor 0.22.1's local trial bundles published Core 2.3.2; templates,
examples and other apps are unchanged. See [text outlines](packages/core/docs/text-layout.md#text-outlines-core-232).

Core 2.3.1 and UI 3.3.0 are published. The Core
patch corrects unstyled blank rich-text line heights without new API requirements. Core adds independent
TextField measurement; UI adds [RichLabel](packages/ui/docs/rich-label.md),
whose only content interface is textFlow, and fixes automatic BitmapLabel
measurement under maxWidth. UI 3.3.0 builds against published Core 2.3.1 without
local overrides; its registry installation and lockfile are ready. Native/programmatic support precedes KUI, CLI and Editor
integration; existing projects are not changed. Latest published native versions are
Core 2.5.3 and UI 3.4.0.

Published ui-document 0.12.0 provides the shared BitmapLabel/RichLabel authoring contract,
including typed bitmap-font resources and literal textFlow Span elements with
Skin states. See [text component authoring](packages/ui-document/docs/text-components.md).
Published CLI 3.4.0 and ui-runtime 0.9.0 provide native text compilation and
materialization, using published document 0.12.0, UI 3.3.0 and Core 2.3.1.
Older CLI 3.3.1 and runtime 0.8.2 do not include these registrations.
Editor adoption is explicit; old apps and templates are unchanged.

Core 2.2.1 is published. The patch
fixes minified dictionary/emergency wrapping and keeps grapheme clusters intact
in TextField word and character wrapping. UI 3.2.0/runtime 0.8.2 and
Game/DragonBones peers accept it. Current UI 3.4.0/runtime 0.10.0 require Core
^2.4.0, which includes it. To adopt the fix, update the Core installation/lock; unchanged SDKs need
no new release. See
[text layout](packages/core/docs/text-layout.md).

The separate Spine repository publishes 4.0–4.2 adapter 0.2.1 and 4.3 adapter
0.3.1 with peer `^1.0.16 || ^2.0.0`, validated against Core 1.0.16, 2.0.0 and
2.2.1. Publication was verified on npm on 2026-10-08. Earlier 0.2.0 / 0.3.0
declare only `^1.0.16`. Existing application caret ranges accept
these adapter patches without a manifest version increase.

Packages release independently. A compatible Core patch does not require new
UI/Game/DragonBones/ui-runtime releases. Peers express the minimum required
host contract; development dependencies and lockfiles record the tested checkout.
Applications adopt fixes through their own dependency updates and rebuilds.
See the [dependency graph and release policy](docs/dependency-policy.md) for
ordinary versus peer dependencies, release scope and targeted updates.

The published package dependency ranges are:

| Consumer          | Required Kurot packages                           |
| ----------------- | ------------------------------------------------- |
| Core 2.4.0        | bitmap-font `^0.1.0`                              |
| UI 3.4.0          | Core `^2.4.0`                                     |
| Game 2.0.0        | Core `^2.0.0`                                     |
| CLI 3.5.0         | ui-document `^0.13.0`                             |
| ui-runtime 0.10.0 | Core `^2.4.0`, UI `^3.4.0`, ui-document `^0.13.0` |
| dragonbones 0.1.0 | Core `^2.1.1`                                     |

CLI 3.2.1 is published with project styles, bundled fonts and
English translations in the game template; existing projects are not rewritten.
See [game template setup](packages/cli/docs/game-template.md).

CLI 3.3.1 is published with development synchronization of all
runtime resources, including atlas PNG/JSON, locale configuration, fonts and
translations. Browser refresh remains manual. Engine examples and the KUI sample
install CLI 3.3.1 from npm. The Editor working tree uses CLI 3.5.0 with document
0.13.0 and runtime 0.10.0. Legacy EXML projects keep
CLI 1.3.x. Source versions alone do not confirm publication or installed versions.
See [resource watching](packages/cli/docs/dev-resource-watching.md).

ui-document 0.11.0 is published with `style.json.labels` presets and Default-only
`textStyle="@style:labels:<key>"` on Labels. Local properties and individual
state overrides take precedence; compilation expands copies into native
properties while XML/history retain references. These APIs are absent from
ui-document 0.10.0 and CLI 3.2.1. Published CLI 3.3.0 uses
the registry kernel through `^0.11.0` without a local override. ui-runtime 0.8.2
is published with the same kernel; runtime 0.8.1 excludes it.
See [the Label preset contract](packages/ui-document/docs/project-styles.md#label-typography-presets-in-0110).

CLI 3.2.0 and ui-document 0.10.0 are published. They share the optional
`resource/config/style.json` font/color parser and `@style:colors:<key>` XML
references. CLI resolves color references into numeric values before generating
Skin factories; font loading belongs to the application. XML and document
history retain authored references. The previous `@token:color:<key>` XML prefix
is rejected, so update those references explicitly. See
[project styles](packages/ui-document/docs/project-styles.md).

ui-runtime 0.8.2 adopts ui-document `^0.11.0`. Consumers expand Label presets
and resolve colors in disposable copies; plain color-only consumers may register
palette entries as design tokens. The runtime does not read style.json or load
fonts. Editor 0.19.2 adopted that historical package set without local overrides.
The KUI sample and engine examples already use published CLI 3.3.1; the sample
also uses ui-document 0.11.0 without local overrides.
CLI-built skins run directly through UI and do not require ui-runtime. No
Core/UI release is needed for compiled style colors.

The document kernel retains the literal-string XML contract. Remove old
synthetic backslash text prefixes explicitly; Editor and CLI must share the
same parser contract. ui-document 0.9 adds Label fitting metadata while retaining
format version 2. ui-runtime 0.8 materializes fitting properties through native
Labels without changing the authored size or semantic document.

Install Core 2.1.1 or later within Core 2.x to receive the nested/rotated
WebGL scroll clipping fix; the UI, Game and ui-runtime peer ranges already
accept it. Core 2.0 and CLI 3.0+ require object-valued sheet `subkeys` in
resource manifests. Refresh old sheets in Kurot Editor before upgrading a KUI project; see the
[resource migration contract](packages/ui-document/docs/resource-nine-slice.md).

```text
@kurot/bitmap-font (headless shared dependency)
 └─ @kurot/core
     ├─ @kurot/ui
     ├─ @kurot/game
     └─ @kurot/dragonbones

@kurot/cli  (build-time only)
 └─ @kurot/ui-document

@kurot/ui-document  (headless editing-time document model)

@kurot/ui-runtime
 ├─ @kurot/ui-document
 ├─ @kurot/ui
 └─ @kurot/core
```

## Getting started

### Requirements

- Node.js 20 or later
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

### Measured renderer status

The documented shared benchmark measured Kurot 1.0.15, PixiJS 8.20.0, and Egret
5.4.1 with deterministic workloads. On an Apple M1 Max in headless Chromium
151, Kurot and PixiJS both reduced six ordinary sprite/container workloads to
one draw call and remained in the same frame-time band. PixiJS retained a small
renderer-call advantage in several cases and a clear lead in the 50-object
filter workload: WebGL 2 Frame P95 was 17.9 ms for PixiJS and 25.0 ms for Kurot,
with 150 versus 200 draw calls.

Against Egret 5.4.1 on WebGL 1, the same benchmark measured the following draw
calls. These values describe the named workloads, not universal speed-up
factors:

| Workload                               | Kurot | Egret 5.4.1 |
| -------------------------------------- | ----: | ----------: |
| 500 single-texture sprites             |     1 |           1 |
| 500 sprites across eight textures      |     1 |         500 |
| 300 dynamic transforms                 |     1 |           1 |
| 500 objects in a deep container tree   |     1 |         500 |
| 500 objects with display-list churn    |     1 |         451 |
| 500 objects with dynamic texture swaps |     1 |       167.3 |

These are scoped workload results, not a claim that Kurot matches PixiJS as a
whole or that draw-call ratios translate directly into equal FPS gains. The
benchmark method and commands are documented in the
[`@kurot/core` README](packages/core/README.md#validated-renderer-comparison).

### Measured UI status

The initial `@kurot/ui` browser benchmark confirms that core rendering
efficiency reaches the UI layer:

| Workload                           | Frame P95 | Render P95 | Draw calls | Lifecycle evidence                         |
| ---------------------------------- | --------: | ---------: | ---------: | ------------------------------------------ |
| 400-node static image UI           |  10.20 ms |    0.20 ms |          1 | No repeated validation after stabilization |
| 240-node transform/alpha animation |  10.00 ms |    0.30 ms |          1 | No measure or display-list validation      |
| 10,000-record virtual list         |   9.90 ms |    0.50 ms |          5 | At most 19 live ItemRenderers              |

The animation workload performs one coalesced `commitProperties` call per
moving UI component per frame because position participates in the unified
layout/content-bound invalidation model. It does not cause repeated measure,
layout, texture upload, or extra draw calls in this workload. The virtual list
creates renderers for the visible window rather than for all 10,000 records.

These measurements support a scoped conclusion: Kurot UI preserves core
batching for image-based static and transform/alpha workloads, reaches a clean
stable state, and bounds virtual-list renderer population. They are a
self-baseline from one Chromium environment, not a cross-framework or
cross-device ranking. Commands and measurement details are documented in the
[`@kurot/ui` README](packages/ui/README.md#ui-benchmark).

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
games and future editors. Version 0.1.0 and Core 2.2.0 are published; Core uses
its registry dependency for FontAnalyzer and BitmapText rendering. Published
UI 3.2.0 adds BitmapLabel, requires Core ^2.2.0 and has no local override.
Published UI 3.1.0 lacks BitmapLabel. See [font format](packages/bitmap-font/docs/format.md) and
[Core integration](packages/core/docs/bitmap-fonts.md). KUI/Editor adoption is
separate from these native runtime components.
