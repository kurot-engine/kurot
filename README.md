# Kurot

Kurot is a web-focused 2D game engine: a modern rewrite of the Egret engine built on **TypeScript, ESM, and ES2022**. It preserves the Egret-style display object, event, graphics, EUI, and EXML developer experience while adopting an instruction-based rendering architecture: a flat instruction set is built first, then executed by the rendering pipelines.

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
- EUI-compatible components, layout, states, data binding, and theming system.
- Build-time EXML → ESM compilation, with no XML parsing at runtime.
- A headless `kui.*` UI document model and explicit runtime materialization layer
  for future editors and Agent workflows.
- Tween, MovieClip, ScrollView, and URLLoader game extensions.

> **Naming note:** the npm packages have migrated to `@kurot/*`. Legacy `blakron` identifiers in the CLI, config files, and source paths will be unified in later migration steps.

## From Egret to Kurot

Kurot is a continuation of Egret 5.4.1 for the modern web platform, not a new
API placed on top of the old renderer. It retains the productive display-object,
event, EUI, and EXML model while replacing the rendering and build foundations.

| Area | Egret 5.4.1 | Kurot |
| ---- | ----------- | ----- |
| GPU backend | WebGL 1 | WebGL 2 preferred, WebGL 1 fallback |
| Software fallback | Canvas 2D | Canvas 2D |
| Batching | Primarily consecutive same-texture draws | Up to eight textures in one batch |
| Render organization | RenderNode tree | Flat `InstructionSet` + `RenderPipe` execution |
| Update model | RenderNode/display-tree updates | Separate `structureDirty` rebuilds and `renderDirty` patches |
| Modules | Namespace/global-oriented runtime | Native ESM |
| Language target | Legacy web/TypeScript environment | ES2022 with `strict: true` |
| EXML | Egret runtime/toolchain model | Build-time EXML → ESM compilation |

Canvas 2D fallback is a capability shared by both engines; it is not presented
as a Kurot invention. Kurot's measurable renderer evolution is its modern
WebGL2-capable pipeline and multi-texture batching, together with a reproducible
correctness and performance validation system.

## Packages and dependencies

Kurot is composed of several independently maintained pnpm packages. The repository root currently has no `pnpm-workspace.yaml` or unified root-level build script, so install dependencies and run commands from within each package directory.

| Package                                                | Version | Path                   | Responsibility                                                                                                 | Internal dependencies |
| ------------------------------------------------------ | ------- | ---------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------- |
| [`@kurot/core`](packages/core/README.md)               | 1.0.15  | `packages/core`        | Core engine capabilities: display objects, rendering, events, geometry, text, resources, networking, and media | None                  |
| [`@kurot/ui`](packages/ui/README.md)                   | 1.1.7   | `packages/ui`          | EUI-compatible UI components, layout, skins, theming, and data binding                                         | `@kurot/core`         |
| [`@kurot/game`](packages/game/README.md)               | 1.0.6   | `packages/game`        | Game extensions: Tween, MovieClip, ScrollView, URLLoader, etc.                                                 | `@kurot/core`         |
| [`@kurot/cli`](packages/cli/README.md)                 | 1.1.3   | `packages/cli`         | Node.js build tooling, project scaffolding, and the EXML compiler                                              | None                  |
| [`@kurot/ui-document`](packages/ui-document/README.md) | 0.3.5   | `packages/ui-document` | Headless UI assets, appearance variants, validation, operations, transactions, revisions, diffs, and undo/redo | None                  |
| [`@kurot/ui-runtime`](packages/ui-runtime/README.md)   | 0.2.2   | `packages/ui-runtime`  | Materializes semantic assets and reusable components into real Kurot UI component trees                        | `core`, `ui`, `ui-document` |

Dependencies flow in one direction: `core` is the foundation package; `ui` and `game` depend only on `core` and not on each other. `ui-document` stays headless, while `ui-runtime` is the explicit browser boundary that connects its semantic data to `ui` and `core`. `cli` remains build-time only. Versioned Spine adapters are maintained separately in the `Kurot-Spine` repository.

`@kurot/ui-document` 0.3 provides the reusable semantic model and headless
editing kernel. `@kurot/ui-runtime` 0.2 validates and renders that model,
including component instances, Slots, appearances, states, variants, resources,
and design tokens. Version 0.2 executes component variants, dynamic
per-instance component states, selected appearance variants, and native
appearance states.

```text
@kurot/core
 ├─ @kurot/ui
 └─ @kurot/game

@kurot/cli  (build-time only)

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

Replace `core` with `cli`, `ui`, `game`, `ui-document`, or `ui-runtime` to install and build the corresponding package:

```sh
pnpm --dir packages/<package> install
pnpm --dir packages/<package> build
```

All six packages provide a one-shot test command:

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
pnpm --dir packages/cli blakron -- <command>
```

The CLI supports project creation, building, a dev server, and cleanup. Generated projects continue to use the `blakron` command and `blakron.config.ts` config file, for compatibility with the currently published packages.

## Architecture overview

The ownership and dependency boundaries of the semantic UI stack are recorded
in [`UI-ARCHITECTURE.md`](UI-ARCHITECTURE.md).

### Rendering pipeline

`@kurot/core` uses a two-phase rendering approach:

1. **Build**: walks the scene graph and produces a flat `InstructionSet`, rather than recursively processing a RenderNode tree.
2. **Execute**: dispatches instructions to the corresponding `RenderPipe` by `renderPipeId` to perform the actual drawing.

This design separates scene structure changes from render data updates: `structureDirty` triggers instruction set rebuilds, while `renderDirty` triggers partial data updates. The WebGL backend supports multi-texture batching; when WebGL is unavailable, it falls back to the Canvas 2D backend.

### Measured renderer status

The current shared benchmark compares Kurot 1.0.15, PixiJS 8.20.0, and Egret
5.4.1 with deterministic workloads. On an Apple M1 Max in headless Chromium
151, Kurot and PixiJS both reduced six ordinary sprite/container workloads to
one draw call and remained in the same frame-time band. PixiJS retained a small
renderer-call advantage in several cases and a clear lead in the 50-object
filter workload: WebGL 2 Frame P95 was 17.9 ms for PixiJS and 25.0 ms for Kurot,
with 150 versus 200 draw calls.

Against Egret 5.4.1 on WebGL 1, the same benchmark measured the following draw
calls. These values describe the named workloads, not universal speed-up
factors:

| Workload | Kurot | Egret 5.4.1 |
| -------- | ----: | ----------: |
| 500 single-texture sprites | 1 | 1 |
| 500 sprites across eight textures | 1 | 500 |
| 300 dynamic transforms | 1 | 1 |
| 500 objects in a deep container tree | 1 | 500 |
| 500 objects with display-list churn | 1 | 451 |
| 500 objects with dynamic texture swaps | 1 | 167.3 |

These are scoped workload results, not a claim that Kurot matches PixiJS as a
whole or that draw-call ratios translate directly into equal FPS gains. The
benchmark method and commands are documented in the
[`@kurot/core` README](packages/core/README.md#validated-renderer-comparison).

### Measured UI status

The initial `@kurot/ui` browser benchmark confirms that core rendering
efficiency reaches the UI layer:

| Workload | Frame P95 | Render P95 | Draw calls | Lifecycle evidence |
| -------- | --------: | ---------: | ---------: | ------------------ |
| 400-node static image UI | 10.20 ms | 0.20 ms | 1 | No repeated validation after stabilization |
| 240-node transform/alpha animation | 10.00 ms | 0.30 ms | 1 | No measure or display-list validation |
| 10,000-record virtual list | 9.90 ms | 0.50 ms | 5 | At most 19 live ItemRenderers |

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

### EXML and EUI

`@kurot/cli` parses `.exml` files into SkinIR at build time and generates ESM modules. At runtime, `@kurot/ui`'s theming system dynamically loads the generated skin factories, so build artifacts don't need to carry or parse EXML source files.

Custom EXML namespaces are explicitly mapped to module entry points via `exml.namespaces` in `blakron.config.ts`, replacing Egret's runtime global namespace reflection.

## Examples

- [`examples/demo`](examples/demo/): a Vite-based example project demonstrating a hand-written EXML compilation integration.
- [`examples/my-game`](examples/my-game/): a standard game project example generated from the CLI template.

## Repository layout

```text
Kurot/
├── AGENTS.md       Context index for AI agents / contributors — read this first
├── packages/       Independently published engine packages and CLI
├── examples/       Demo and generated project examples
├── docs/           Contribution rules — committed
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
