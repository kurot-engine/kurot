# Kurot

Kurot is a web-focused 2D game engine: a modern rewrite of the Egret engine built on **TypeScript, ESM, and ES2022**. It preserves the Egret-style display object, event, graphics, EUI, and EXML developer experience while adopting an instruction-based rendering architecture: a flat instruction set is built first, then executed by the rendering pipelines.

Core features include:

- Egret-style `DisplayObject`, event, geometry, graphics, resource, and media APIs.
- A **Build → Execute** rendering flow, with WebGL multi-texture batching and RenderGroup layering.
- A WebGL primary rendering backend with a Canvas 2D fallback backend.
- EUI-compatible components, layout, states, data binding, and theming system.
- Build-time EXML → ESM compilation, with no XML parsing at runtime.
- Tween, MovieClip, ScrollView, URLLoader, and Spine 4.3 support.

> **Naming note:** the npm packages have migrated to `@kurot/*`. Legacy `blakron` identifiers in the CLI, config files, and source paths will be unified in later migration steps.

## Packages and dependencies

Kurot is composed of several independently maintained pnpm packages. The repository root currently has no `pnpm-workspace.yaml` or unified root-level build script, so install dependencies and run commands from within each package directory.

| Package                                            | Path                 | Responsibility                                                                                                 | Internal dependencies |
| -------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------- |
| [`@kurot/core`](packages/core/README.md)           | `packages/core`      | Core engine capabilities: display objects, rendering, events, geometry, text, resources, networking, and media | None                  |
| [`@kurot/ui`](packages/ui/README.md)               | `packages/ui`        | EUI-compatible UI components, layout, skins, theming, and data binding                                         | `@kurot/core`         |
| [`@kurot/game`](packages/game/README.md)           | `packages/game`      | Game extensions: Tween, MovieClip, ScrollView, URLLoader, etc.                                                 | `@kurot/core`         |
| [`@kurot/spine-4.3`](packages/spine-4.3/README.md) | `packages/spine-4.3` | Skeletal animation runtime adapted from Spine 4.3                                                              | `@kurot/core`         |
| [`@kurot/cli`](packages/cli/README.md)             | `packages/cli`       | Node.js build tooling, project scaffolding, and the EXML compiler                                              | None                  |

Dependencies flow in one direction: `core` is the foundation package; `ui`, `game`, and `spine-4.3` depend only on `core` and not on each other; `cli` is a build-time-only tool and is never pulled into the browser runtime.

```text
@kurot/core
 ├─ @kurot/ui
 ├─ @kurot/game
 └─ @kurot/spine-4.3

@kurot/cli  (build-time only)
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

Replace `core` with `cli`, `ui`, `game`, or `spine` to install and build the corresponding package:

```sh
pnpm --dir packages/<package> install
pnpm --dir packages/<package> build
```

`core`, `cli`, `ui`, and `game` provide a one-shot test command:

```sh
pnpm --dir packages/<package> test
```

`spine` currently has no test script. Every package supports a TypeScript compile-watch command:

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

### Rendering pipeline

`@kurot/core` uses a two-phase rendering approach:

1. **Build**: walks the scene graph and produces a flat `InstructionSet`, rather than recursively processing a RenderNode tree.
2. **Execute**: dispatches instructions to the corresponding `RenderPipe` by `renderPipeId` to perform the actual drawing.

This design separates scene structure changes from render data updates: `structureDirty` triggers instruction set rebuilds, while `renderDirty` triggers partial data updates. The WebGL backend supports multi-texture batching; when WebGL is unavailable, it falls back to the Canvas 2D backend.

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
