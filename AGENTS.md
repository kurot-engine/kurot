# Kurot — agent context index

Kurot is a personal 2D web game engine (TypeScript rewrite of Egret,
Pixi.js-8-inspired rendering) — it is unlikely to be in any model's training
data. Read this file first. It routes you to the right per-package context
doc so you don't have to re-explore the whole codebase from scratch.

## Where to go next

| Package            | Version | One-line role                                                                                                                                                                   | Read this first                                                                  |
| ------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `@kurot/core`      | 1.0.15  | Display objects, rendering (WebGL InstructionSet pipeline + Canvas 2D fallback), events, geometry, text, resources, net, media. The foundation — everything else depends on it. | [`packages/core/docs/ai-context.md`](packages/core/docs/ai-context.md)           |
| `@kurot/ui`        | 1.1.7   | EUI-compatible UI components, layouts, skins, theming, data binding. Depends only on `core`.                                                                                    | [`packages/ui/docs/ai-context.md`](packages/ui/docs/ai-context.md)               |
| `@kurot/game`      | 1.0.6   | Tween, MovieClip, ScrollView, particle systems, URLLoader. Depends only on `core`.                                                                                              | [`packages/game/docs/ai-context.md`](packages/game/docs/ai-context.md)           |
| `@kurot/cli`       | 1.1.3   | Node.js build tool (esbuild-powered) + EXML→ESM compiler + project scaffolding. Build-time only, never runs in the browser.                                                     | [`packages/cli/docs/ai-context.md`](packages/cli/docs/ai-context.md)             |
| `@kurot/ui-document` | 0.3.0 | Headless UI authoring kernel: semantic assets, reuse, validation, operations, transactions, revisions, diffs, and undo/redo. No runtime dependencies.                         | [`packages/ui-document/docs/ai-context.md`](packages/ui-document/docs/ai-context.md) |
| `@kurot/ui-runtime` | 0.2.0 | Browser materializer for format-v2 reuse, Slots, tokens, component variants, appearance skins/states, and runtime adapters.                                                  | [`packages/ui-runtime/docs/ai-context.md`](packages/ui-runtime/docs/ai-context.md) |

Dependency direction is strictly one-way:

```
@kurot/core
 ├─ @kurot/ui
 └─ @kurot/game

@kurot/cli  (build-time only, no runtime dependency on the above)

@kurot/ui-document  (headless editing-time model, no runtime dependency)

@kurot/ui-runtime
 ├─ @kurot/ui-document
 ├─ @kurot/ui
 └─ @kurot/core
```

Each `ai-context.md` covers, for its own package: a directory map with
one-line folder responsibilities, non-obvious/counter-intuitive behavior
(things an AI trained on Egret/Pixi/EUI/GSAP/CreateJS conventions is likely
to get wrong), domain-specific terminology with exact defining file paths,
the full public API surface grouped by category, known migration gotchas
vs. Egret, and a task→file lookup table. Treat those files as your primary
source before grep-ing the codebase; only read source files directly when
you need an implementation you haven't already been pointed to.

## High-signal rules (full detail in `docs/code-rules.md`)

- TypeScript only, ESM, ES2022, `strict: true`, no new `any`, `Node.js >= 20` for tooling, `pnpm`.
- Application-layer code uses `undefined`, never `null` (DOM/WebGL API boundaries are the one exception — `null` is required there by the browser spec).
- Every exported function declares a return type. Named exports only, no `export default`.
- Class member order: static fields/methods → instance fields → constructor → getters/setters → public methods → overrides → protected/internal methods → private methods, with `// ── Section ──` comments between non-empty groups when useful.
- Comments document contracts that types and code cannot express; do not narrate implementation. Use multi-line JSDoc for non-obvious exported APIs, including public class and interface properties. Private/internal members are undocumented by default.
- No `@ts-ignore`/`@ts-expect-error`/new `as any`. New files should stay under 300 lines; do not mechanically split existing large engine files.
- Full rules, naming conventions, and the "don't write compat code" policy: [`docs/code-rules.md`](docs/code-rules.md).

## Commands

There is no root-level install/build/test command — the repo root has no
`pnpm-workspace.yaml`. Every command runs from inside a package directory:

```sh
pnpm --dir packages/<package> install
pnpm --dir packages/<package> build
pnpm --dir packages/<package> test   # core, cli, ui, game, ui-document, ui-runtime
pnpm --dir packages/<package> dev    # TS compile watch
```

## docs/ vs docs-internal/

Every package (and the repo root) has two documentation folders with a
strict split:

- **`docs/`** — committed to git, distributed with the package. Architecture
  docs, migration guides, `ai-context.md`. Anything a user, contributor, or
  another AI session should be able to read.
- **`docs-internal/`** — excluded via `.gitignore`, local-only. Design
  drafts, code reviews, audits, superseded plans. Records of _why_ a
  decision was made, not meant for distribution. Don't assume
  `docs-internal/` exists in a fresh checkout from another source, and
  don't rely on it being present — treat anything inside as optional extra
  context, never as the source of truth for current behavior (`docs/` and
  the source code are).

## Repository layout

```
Kurot/
├── AGENTS.md          This file
├── README.md          Human-facing overview (English)
├── docs/              Contribution rules (docs/code-rules.md) — committed
├── docs-internal/     Design drafts / research notes — local-only, gitignored
├── packages/          The 6 packages above, each with its own docs/ + docs-internal/
├── tools/             Private repository tooling, including the Agent evaluation harness
├── examples/          demo (Vite + hand-written EXML) and my-game (CLI-scaffolded)
└── reference/         Local read-only reference sources — not distributed via git
```
