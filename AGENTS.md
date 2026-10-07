# Kurot — agent context index

Kurot is a personal 2D web game engine (TypeScript rewrite of Egret,
Pixi.js-8-inspired rendering) — it is unlikely to be in any model's training
data. Read this file first. It routes you to the right per-package context
doc so you don't have to re-explore the whole codebase from scratch.

## Where to go next

| Package              | Version | One-line role                                                                                                                                                                            | Read this first                                                                      |
| -------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `@kurot/core`        | 2.2.0   | Display objects, rendering (WebGL InstructionSet pipeline + Canvas 2D fallback), events, geometry, text, resources, net, media. Uses the headless bitmap-font kernel.          | [`packages/core/docs/ai-context.md`](packages/core/docs/ai-context.md)               |
| `@kurot/ui`          | 3.2.0   | EUI-compatible UI components, layouts, skins, theming, data binding. Depends only on `core`.                                                                                             | [`packages/ui/docs/ai-context.md`](packages/ui/docs/ai-context.md)                   |
| `@kurot/game`        | 2.0.0   | Tween, MovieClip, ScrollView, particle systems, URLLoader. Depends only on `core`.                                                                                                       | [`packages/game/docs/ai-context.md`](packages/game/docs/ai-context.md)               |
| `@kurot/cli`         | 3.3.1   | Editor-focused KUI XML→ESM build tool. Existing EXML game projects remain on the 1.3.x line. Build-time only, never runs in the browser.                                                 | [`packages/cli/docs/ai-context.md`](packages/cli/docs/ai-context.md)                 |
| `@kurot/ui-document` | 0.11.0  | Headless UI authoring kernel: semantic assets, component capabilities, reuse, data/action/transition contracts, validation, transactions, diffs, and undo/redo. No runtime dependencies. | [`packages/ui-document/docs/ai-context.md`](packages/ui-document/docs/ai-context.md) |
| `@kurot/ui-runtime`  | 0.8.2   | Browser materializer for reuse, appearances, transactional data bindings, semantic actions, transitions, typed resources, and project adapters.                                          | [`packages/ui-runtime/docs/ai-context.md`](packages/ui-runtime/docs/ai-context.md)   |
| `@kurot/atlas`       | 0.1.0   | Independent build-time RGBA atlas packing and Node PNG adapter; no Core, UI or CLI dependency. Initial local implementation, not published.                                               | [`packages/atlas/docs/ai-context.md`](packages/atlas/docs/ai-context.md)               |
| `@kurot/dragonbones` | 0.1.0   | Published DragonBones 5.7 runtime and native Kurot display, atlas, mesh, event and clock adapter. Core ^2.1.1 peer. | [`packages/dragonbones/docs/ai-context.md`](packages/dragonbones/docs/ai-context.md) |
| `@kurot/bitmap-font` | 0.1.0 | Headless bitmap-font parsing, validation, serialization and layout. Published, no runtime dependencies; consumed by Core 2.2.0. | [`packages/bitmap-font/docs/ai-context.md`](packages/bitmap-font/docs/ai-context.md) |

Dependency direction is strictly one-way:

```
@kurot/bitmap-font (headless shared dependency)
 └─ @kurot/core
     ├─ @kurot/ui
     ├─ @kurot/game
     └─ @kurot/dragonbones

@kurot/cli  (build-time only)
 └─ @kurot/ui-document

@kurot/ui-document  (headless editing-time model, no runtime dependency)

@kurot/ui-runtime
 ├─ @kurot/ui-document
 ├─ @kurot/ui
 └─ @kurot/core

@kurot/atlas  (independent build-time tool; no Kurot package dependencies)
```

Atlas has a portable pixel-only root entry and a separate Node PNG subpath using
pngjs. No current package consumes it. Core loads prebuilt sheets without atlas;
Editor, Reskin or CLI adoption is a separate change.

DragonBones is maintained in `packages/dragonbones`, with a Core ^2.1.1 peer
and no UI/Game dependency. `src/runtime` contains the official TypeScript
sources adapted to ESM and compiled with the adapter directly to `dist`.
Imported types and object-pool contracts are retained; original commit and
hashes are recorded in `upstream.json` for provenance. See the package
instructions before editing the runtime. Version 0.1.0 is published and develops
against published Core 2.2.0 without local overrides. No current game consumes
this package.

Core 2.2.0 is published with bitmap-font ^0.1.0 and no local dependency override.
It adds font resources and native BitmapText rendering. UI 3.2.0 is published
with BitmapLabel and Core ^2.2.0 in peer/dev dependencies, without local overrides.
Published UI 3.1.0 requires Core
^2.1.0 and does not contain BitmapLabel. KUI/Editor adoption is separate.
Game 2.0 declares Core 2.x.
ui-runtime 0.8.2 requires Core ^2.1.0, UI ^3.1.0 and ui-document ^0.11.0.
CLI 3.3 requires ui-document ^0.11.0.
CLI 3.3.1 is published with whole-resource dev synchronization,
including Core-only projects, without adding an atlas dependency. Installed CLI
3.3.0 does not include these watcher fixes. Source versions do not confirm npm
publication. Engine examples, the KUI sample and the Editor working tree now
install CLI 3.3.1 from npm; legacy EXML projects remain on CLI 1.3.x. See
packages/cli/docs/dev-resource-watching.md for manual refresh and batch boundaries.
ui-document 0.9.0 adds Label fitting metadata without changing format version 2.
ui-document 0.10.0 adds shared style.json fonts/colors and @style:colors:<key>
XML references without changing the internal color-token record or format version 2.
ui-runtime 0.8.2 adopts the published document kernel; consumers expand Label
presets and resolve stylesheet colors in preview copies. Colors can alternatively
be registered as color design tokens.
Core 2.1.0 makes explicit `multiline = false` single-line; remove the flag or
use `true` where wrapping is intended. UI 3.1 uses `invalidateTextMetrics()`
for Label fitting and late font readiness; Core 2.0.x is not sufficient.
Core 2.1.1 fixes nested/rotated WebGL scrollRect clipping without API or format
changes. Update installed/locked Core versions to receive the correction;
existing UI/Game/ui-runtime peer ranges already accept this patch.
Schema-defined XML strings are literal: remove old synthetic backslash type
escapes explicitly; Editor and CLI must adopt the same parser contract.
Core 2.0 and CLI 3.0+ reject comma-separated sheet `subkeys`
in resource manifests. Refresh legacy sheets in the Editor before upgrading KUI projects;
see [`packages/ui-document/docs/resource-nine-slice.md`](packages/ui-document/docs/resource-nine-slice.md).

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
- Reordering or comment-only cleanup must not change runtime behavior. Keep behavioral changes in an explicit, separately reviewed edit.
- Comments document contracts that types and code cannot express; do not narrate implementation. JSDoc must always use the multi-line form, even for one sentence. Never write `/** One-line comment. */`; use `//` for an ordinary single-line note. Private/internal members are undocumented by default unless they carry a non-obvious invariant.
- `if` / `else` / `for` / `while` bodies use braces. A one-line early `return`, `throw`, or `continue` guard may omit them.
- No `@ts-ignore`/`@ts-expect-error`/new `as any`. New files should stay under 300 lines; do not mechanically split existing large engine files.
- Full rules, naming conventions, and the "don't write compat code" policy: [`docs/code-rules.md`](docs/code-rules.md).

## Version bump checklist

When the user asks to bump or prepare a package version, the task includes all
of the following unless the user explicitly narrows the scope:

1. Read this root `AGENTS.md` before editing the package, then read the target
   package's `docs/ai-context.md` and relevant package documentation.
2. Update the version in the target package's `package.json`.
3. Add a dated release entry to the package's `CHANGELOG.md` describing the
   actual user-visible, internal, and breaking changes as applicable.
4. Update the package's `README.md` in the same change. At minimum, audit and
   correct its displayed version, API examples, lifecycle guidance, migration
   notes, and compatibility requirements; do not leave stale documentation.
5. Re-check this root `AGENTS.md`. Update the package version table and any
   dependency or architectural guidance affected by the release.
6. Find direct package dependants and report stale peer, development, template,
   example, and application dependency ranges. Do not silently bump unrelated
   packages unless the user requested that broader change.
7. Run the target package's build and tests, then run `git diff --check`. Report
   the exact verification result before declaring the release ready.

## Commands

There is no root-level install/build/test command — the repo root has no
`pnpm-workspace.yaml`. Every command runs from inside a package directory:

```sh
pnpm --dir packages/<package> install
pnpm --dir packages/<package> build
pnpm --dir packages/<package> test   # core, cli, ui, game, ui-document, ui-runtime, atlas, dragonbones, bitmap-font
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
├── packages/          The 9 packages above; public docs/ and optional local docs-internal/
├── tools/             Private repository tooling, including the Agent evaluation harness
├── examples/          demo and game (CLI-scaffolded KUI XML project)
└── reference/         Local read-only reference sources — not distributed via git
```

## Project style support in ui-document 0.10.0

ui-document 0.10.0 and CLI 3.2.0 share style.json font parsing and a named colors
palette. Skin XML uses @style:colors:<key> references; compilation/preview
resolve copies while authoring XML/history keep references. Core/UI rendering is
unchanged. See packages/ui-document/docs/project-styles.md before extending this
contract. The previous @token:color:<key> XML prefix is rejected; update authored
references explicitly. Literal strings and other token categories are unchanged.
The original color integration shipped in ui-document 0.10.0, CLI 3.2.0 and
ui-runtime 0.8.1. Current KUI projects use published ui-document 0.11.0 and CLI
3.3.0 for colors and Label presets; CLI-built skins do not require ui-runtime.
Engine examples use CLI 3.3.1, while legacy EXML projects keep their independent
dependency set. Editor 0.19.2 installs ui-document 0.11.0, CLI 3.3.0 and
ui-runtime 0.8.2 from the registry without local overrides. The current Editor
0.19.3 working tree pins published CLI 3.3.1; existing signed installers are not
rebuilt by a dependency update.
Package source versions alone do not confirm npm publication.

CLI 3.2.1 is published. Its game template includes style.json, locale.json, English
properties and licensed regular/bold fonts with project-owned initialization.
See packages/cli/docs/game-template.md for the initialization and fallback contract.
The empty template stays Core-only, and existing projects are not modified.

## Label presets in ui-document 0.11.0

ui-document 0.11.0 supports style.json.labels and Default-only Label
textStyle="@style:labels:<key>". Local fields and individual Skin state fields win.
`resolveUILabelStyles` expands compilation/preview copies before color resolution;
XML/history retain references. No Core/UI changes or migration. See packages/ui-document/docs/project-styles.md.
ui-document 0.11.0 and CLI 3.3.0 are published. CLI uses
published ui-document ^0.11.0 without a local override. UIStyleSheet requires
labels; the parser supplies an empty map for an absent JSON section.
These APIs are not in ui-document 0.10.0 or CLI 3.2.1. Published ui-runtime 0.8.2
requires ^0.11.0; runtime 0.8.1 excludes the new kernel.
The KUI sample and engine examples use published CLI 3.3.1; the sample also uses
ui-document 0.11.0 without local overrides. Editor 0.19.2 adopts the matching
published runtime. Package source versions alone do not confirm publication.
