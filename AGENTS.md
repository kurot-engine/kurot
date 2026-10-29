# Kurot — agent context index

Kurot is a TypeScript 2D web game engine derived from Egret, with a
Pixi.js-8-inspired renderer. Use this repository's contracts for Kurot behavior.

## Choose the task first

- **Maintain an SDK package:** read its `docs/ai-context.md` below before
  searching source. It maps directories, exports, non-obvious behavior and tasks.
- **Make a game:** read the [quick guide](packages/core/docs/game-authoring.md)
  and [complete Star Catcher example](examples/star-catcher/README.md). For
  scaffolding, use the CLI template's [game](packages/cli/templates/game/README.md)
  or [empty](packages/cli/templates/empty/README.md) README. In a consumer project,
  use its own README/AGENTS and installed SDK docs/types; source may be absent.
- **Look up an API:** start with Core/Game/UI `docs/api/topics.md`, then read
  only the needed symbol/member pages. Use docs from the installed package version.
- **Make game UI:** read [standard UI authoring](packages/ui/docs/ui-authoring.md)
  for directory/TS–Skin pairing, layout, startup and teardown; use its
  [ScoreHUD recipe](packages/ui/docs/recipes/score-hud.md) for a complete pair.
  Use the consumer project's own template README/AGENTS and installed SDK docs.
- **Change a dependency or plan a release:** read
  [dependency policy](docs/dependency-policy.md). When asked to bump or prepare
  a package version, complete the [version checklist](docs/release-checklist.md).
- **Investigate changes:** read the target package's CHANGELOG.md; repository-wide
  publication and adoption records are in [CHANGELOG.md](CHANGELOG.md).

## Package map

The table records source manifest versions. A consumer's manifest, lock and
installation establish its baseline. Package versions are independent.

| Package | Version | Role | Read first |
| --- | --- | --- | --- |
| `@kurot/core` | 2.5.5 | Display, rendering, events, text, resources, media | [context](packages/core/docs/ai-context.md) |
| `@kurot/ui` | 3.6.2 | Components, layouts, skins, theming, binding | [context](packages/ui/docs/ai-context.md) |
| `@kurot/game` | 2.0.1 | Tween, MovieClip, particles, ScrollView, URLLoader | [context](packages/game/docs/ai-context.md) |
| `@kurot/cli` | 3.7.0 | Build-time KUI XML → ESM and project tooling | [context](packages/cli/docs/ai-context.md) |
| `@kurot/ui-document` | 0.13.2 | Headless UI authoring, validation, transactions/history | [context](packages/ui-document/docs/ai-context.md) |
| `@kurot/ui-runtime` | 0.10.0 | Browser materialization, bindings, actions/transitions | [context](packages/ui-runtime/docs/ai-context.md) |
| `@kurot/atlas` | 0.1.0 | Independent build-time RGBA packing; Node PNG subpath | [context](packages/atlas/docs/ai-context.md) |
| `@kurot/dragonbones` | 0.1.0 | DragonBones 5.7 runtime and native adapter | [context](packages/dragonbones/docs/ai-context.md) |
| `@kurot/bitmap-font` | 0.1.0 | Headless font parsing, validation and layout | [context](packages/bitmap-font/docs/ai-context.md) |

Dependency direction is one-way. Core depends on bitmap-font. UI, Game and
DragonBones use Core peers. CLI depends on ui-document and runs only at build
time. ui-runtime uses Core/UI/document peers; CLI-built skins run without it.
ui-document and Atlas have no Kurot runtime dependencies. Versioned Spine
adapters live in the separate Kurot-Spine repository.

## Read the relevant contract

Read only the branches involved in the task; consult source when these documents
do not establish the required implementation.

| Changing or using | Contract |
| --- | --- |
| Texture/sheet dimensions, density, trim or grids | [texture density](packages/core/docs/texture-density.md) |
| Text alignment, wrapping, input, measurement or outlines | [Core text](packages/core/docs/text-layout.md), [Label layout](packages/ui/docs/label-text-layout.md) |
| Sound playback and loop counts | [audio playback](packages/core/docs/audio-playback.md) |
| Bitmap repeat/clip or centered flips | [bitmap fill](packages/core/docs/bitmap-fill.md), [flips](docs/centered-flips.md) |
| Resource manifests and legacy sheet subkeys | [resource format/migration](packages/ui-document/docs/resource-nine-slice.md) |
| KUI strings, fonts/colors, Label presets | [project styles](packages/ui-document/docs/project-styles.md), [text components](packages/ui-document/docs/text-components.md) |
| CLI game startup, default skins or dev refresh | [template startup](packages/cli/docs/game-template.md), [skins](packages/cli/docs/default-ui-skins.md), [watching](packages/cli/docs/dev-resource-watching.md) |
| Native UI vs semantic editing/runtime ownership | [UI architecture](UI-ARCHITECTURE.md) |

## High-signal rules

Full contribution rules: [docs/code-rules.md](docs/code-rules.md).

- TypeScript, ESM, ES2022, `strict: true`; tooling uses Node.js >= 20 and pnpm.
- Application code uses `undefined`; DOM/WebGL boundaries use spec-required
  `null`. Use named exports and explicit return types on exported functions.
- Add no `any`, `as any`, `@ts-ignore` or `@ts-expect-error`.
- Class order: static fields/methods → instance fields → constructor →
  getters/setters → public methods → overrides → protected/internal → private.
  Use section comments between non-empty groups when helpful.
- Comments describe non-obvious contracts. JSDoc is multi-line, even for one
  sentence; ordinary single-line notes use `//`. Private/internal members need
  documentation only for non-obvious invariants.
- All control-flow bodies use multi-line braced blocks, including single-statement
  return/throw/continue/break guards. New files should stay under 300 lines;
  split by responsibility.
- Reordering/comment cleanup preserves behavior. Make behavioral changes
  explicit; implement only documented compatibility, using public contracts
  rather than assuming Egret/Pixi conventions.
- Keep peer minima at the required API/contract. Compatible dependency patches
  do not trigger dependent SDK bumps. Older accepted locks are optional adoption.
  Update only explicitly selected applications/templates and rebuild as needed.

## Commands and verification

There is no root workspace or unified install/build/test command. Run commands
inside the target package, or use `--dir`:

```sh
pnpm --dir packages/<package> install
pnpm --dir packages/<package> build
pnpm --dir packages/<package> test
pnpm --dir packages/<package> dev
```

All nine packages provide these commands. Run build/tests for changed packages
and finish with `git diff --check`. Add/update tests for observable behavior;
pure documentation/comment changes do not require new unit tests. Package
contexts describe additional relevant browser/integration checks.

## Repository and documentation boundaries

- `packages/`: independently released SDKs; `examples/`: CLI-built consumer
  projects; `tools/`: private tooling including agent evaluations.
- `docs/` and package `docs/`: current contracts, indexes and usage/verification guides.
  Keep release chronology, application adoption and past validation results in
  CHANGELOG.md; keep API availability and current compatibility requirements with
  the relevant contract. Do not append release journals to ordinary guides.
- `docs-internal/`: gitignored local plans/audits, optional context only. Current
  public behavior must be established by public docs and source.
- `reference/`: local read-only material, absent from distributed checkouts.
- Check package-local AGENTS instructions before editing their subtrees;
  DragonBones runtime provenance and bitmap-font rules have their own files.
