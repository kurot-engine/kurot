# Kurot — agent context index

Kurot is a personal 2D web game engine (TypeScript rewrite of Egret,
Pixi.js-8-inspired rendering) — it is unlikely to be in any model's training
data. Read this file first. It routes you to the right per-package context
doc so you don't have to re-explore the whole codebase from scratch.

## Where to go next

| Package              | Version | One-line role                                                                                                                                                                            | Read this first                                                                      |
| -------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `@kurot/core`        | 2.5.1   | Display objects, rendering (WebGL InstructionSet pipeline + Canvas 2D fallback), events, geometry, text, resources, net, media. Uses the headless bitmap-font kernel.                    | [`packages/core/docs/ai-context.md`](packages/core/docs/ai-context.md)               |
| `@kurot/ui`          | 3.4.0   | EUI-compatible UI components, layouts, skins, theming, data binding. Depends only on `core`.                                                                                             | [`packages/ui/docs/ai-context.md`](packages/ui/docs/ai-context.md)                   |
| `@kurot/game`        | 2.0.0   | Tween, MovieClip, ScrollView, particle systems, URLLoader. Depends only on `core`.                                                                                                       | [`packages/game/docs/ai-context.md`](packages/game/docs/ai-context.md)               |
| `@kurot/cli`         | 3.6.0   | Editor-focused KUI XML→ESM build tool. Existing EXML game projects remain on the 1.3.x line. Build-time only, never runs in the browser.                                                 | [`packages/cli/docs/ai-context.md`](packages/cli/docs/ai-context.md)                 |
| `@kurot/ui-document` | 0.13.0  | Headless UI authoring kernel: semantic assets, component capabilities, reuse, data/action/transition contracts, validation, transactions, diffs, and undo/redo. No runtime dependencies. | [`packages/ui-document/docs/ai-context.md`](packages/ui-document/docs/ai-context.md) |
| `@kurot/ui-runtime`  | 0.10.0   | Browser materializer for reuse, appearances, transactional data bindings, semantic actions, transitions, typed resources, and project adapters.                                          | [`packages/ui-runtime/docs/ai-context.md`](packages/ui-runtime/docs/ai-context.md)   |
| `@kurot/atlas`       | 0.1.0   | Independent build-time RGBA atlas packing and Node PNG adapter; no Core, UI or CLI dependency. Published.                                                                                | [`packages/atlas/docs/ai-context.md`](packages/atlas/docs/ai-context.md)             |
| `@kurot/dragonbones` | 0.1.0   | Published DragonBones 5.7 runtime and native Kurot display, atlas, mesh, event and clock adapter. Core ^2.1.1 peer.                                                                      | [`packages/dragonbones/docs/ai-context.md`](packages/dragonbones/docs/ai-context.md) |
| `@kurot/bitmap-font` | 0.1.0   | Headless bitmap-font parsing, validation, serialization and layout. Published, no runtime dependencies; consumed by Core 2.2.0.                                                          | [`packages/bitmap-font/docs/ai-context.md`](packages/bitmap-font/docs/ai-context.md) |

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

## Dependency and release policy

Read [`docs/dependency-policy.md`](docs/dependency-policy.md) before changing
dependency ranges or planning releases. Package versions are independent.
Core→bitmap-font and CLI→ui-document are ordinary dependencies; UI, Game,
DragonBones and ui-runtime use peers for their host contracts. Development
dependencies and lockfiles describe the tested checkout, not consumer minima.

- A compatible dependency patch does not trigger dependent SDK version bumps.
  An older installed/locked version inside an accepted range is optional
  adoption, not an incompatible dependency declaration.
- Keep peers at the real minimum required API/contract; raise them only when
  adopting a new requirement or correcting compatibility metadata.
- SDK development-only declaration/lockfile updates need no version bump or
  npm release unless generated/bundled shipped output changes.
- Apps update their own locks and rebuild when adopting fixes, following their
  own version rules. Do not upgrade templates or other apps incidentally.
- Report required migrations, optional adoption and unaffected consumers
  separately. Never prescribe a blanket package bump or `--latest` update.

Core 2.5.1 is published; npm latest, package download and registry integrity
were verified on 2026-10-10. Its published block-alignment modules match the
tested local build. Dynamic middle alignment centers the complete glyph block
independently of multiline, retaining blank rows and relative row baselines/spacing. INPUT uses
stable editing rows; top/bottom and nominal measurements are unchanged. Block
bounds are cached with the line layout and shared by drawing, link hits and
render padding. Read packages/core/docs/text-layout.md. No public API, dependency
or XML/resource-format change is required. SDK peers accept this patch without
new versions. The explicitly selected Editor 0.27.3, Reskin, Tentax and
MilfMaster checkouts install registry Core 2.5.1 with matching locks and rebuilt
outputs. Editor 0.27.3's release tag has been pushed; CI completion was not
awaited. Other SDKs and CLI are unchanged. Other
applications and independent Reskin projects retain their own installations.

Editor 0.27.3, Reskin and the explicitly selected Templates/tentax and
Templates/milf-master now install registry Core 2.5.1 with matching app locks.
Editor and both templates install CLI 3.6.0; Reskin keeps CLI project-owned.
The demo/game templates use the engine example's native KUI skins, palette and
2× atlas, replacing their EUI defaults. Tentax and MilfMaster synchronize only
their web loading page and logo with the CLI game template. Editor frame measurements and
grid writes are logical; Reskin grid authoring/validation is logical while source
PNG replacement sizes remain physical and repacking retains resolution. Existing
independent Reskin projects and other consumers are unchanged. No SDK bump is required.

Atlas has a portable pixel-only root entry and a separate Node PNG subpath using
pngjs. No current package consumes it. Core loads prebuilt sheets without atlas;
Editor, Reskin or CLI adoption is a separate change.
Core 2.5.0 and CLI 3.6.0 are published, verified on npm on 2026-10-10, including
latest tags, package downloads and registry integrity. Published Core includes
the density/text/scissor fixes. Published CLI includes 16 XML skins, the 2× atlas,
mascot logo and build corrections. Its actual create command generates Core
^2.5.0, UI ^3.4.0 and CLI ^3.6.0. Source versions alone do not confirm publication.

Core 2.5.0 adds independent immutable Texture/SpriteSheet source density, with
physical sampling and logical frame dimensions/trim/grids. Existing 1× resources
retain their behavior. It fixes shared alphabetic/ink text alignment, preserving
stable multiline/input font frames and nominal layout sizes; restores the root
WebGL target after the first scratch allocation; and encloses fractional physical
scissor bounds to retain ItemRenderer edge pixels. Nested/rotated stencil clips
are unchanged. Read packages/core/docs/texture-density.md and text-layout.md.

CLI 3.6.0 ships 16 native XML skins, a Kurot-owned rounded 2× atlas (512×512,
sheet resolution: 2), palette colors and a looping mascot brand splash. XML sizes
and nine-slice grids stay logical. Default Button padding is symmetric and Panel
titles use middle alignment. It also preserves development constructor names
for Theme lookup and omits empty runtime asset directory trees after KUI filtering.
Read packages/cli/docs/default-ui-skins.md. The new game skin kit requires
Core ^2.5.0. `create` resolves registry SDK versions; template placeholders remain
latest and existing projects retain their own resources and locks.

Private tools/default-ui-assets uses registry Atlas 0.1.0 and pinned resvg;
CLI and runtime SDKs gain no atlas dependency. It generates the game template
and examples/game assets. An isolated native gallery links built checkout Core
and installed registry UI/Game/document without editing application installations.
The game example has an explicit document dependency for project font/style setup.

UI, Game, DragonBones, Spine and ui-runtime peers already accept Core 2.5.0;
no dependent SDK bump, raised peer minimum or development-lock update is required.
CLI retains published document ^0.13.0. Apps adopt Core installation/lock and
rebuild explicitly. Projects adopting the new 2× skin kit require Core ^2.5.0;
Editor/Reskin authoring adoption also needs logical frame measurements derived
from sheet density. Their installations are unchanged. UI/document APIs,
resource-manifest/KUI formats and all seven other package versions are unchanged.

DragonBones is maintained in `packages/dragonbones`, with a Core ^2.1.1 peer
and no UI/Game dependency. `src/runtime` contains the official TypeScript
sources adapted to ESM and compiled with the adapter directly to `dist`.
Imported types and object-pool contracts are retained; original commit and
hashes are recorded in `upstream.json` for provenance. See the package
instructions before editing the runtime. Version 0.1.0 is published and develops
against published Core 2.2.0 without local overrides. No current game consumes
this package.

Core 2.4.0 is published, verified on npm on 2026-10-09. It adds independent
centered flipX/flipY and the reflection-frame hook, without changing authored
negative-scale semantics. UI 3.4.0 and ui-document 0.13.0 are published, verified
on npm on 2026-10-09. UI requires Core ^2.4.0 and installs the registry release
with a matching pnpm lock. CLI 3.5.0 development now installs document 0.13.0;
ui-runtime 0.10.0 development installs all three published peers with one shared
Core and a matching registry lock. CLI 3.5.0 and runtime 0.10.0 are published, verified on npm on 2026-10-09.
Editor 0.24.0 explicitly adopts all five registry SDKs. Game/DragonBones/Spine
need no release; other applications and templates retain their own dependencies.
Read docs/centered-flips.md for the published contracts and consumer adoption order.

Published CLI 3.6.0 has an asset-copy correction that omits empty runtime directory
trees after filtering KUI sources, including skin-only resource/ui. Generated
theme JSON and compiled Skin modules remain required; mixed directories retain
runtime files, and template copies preserve empty directories. Registry CLI 3.5.0
does not include the correction. Adoption needs a CLI 3.6.0 installation and a
project rebuild, without engine changes or dependency/format migration.

Core 2.3.3 is published, verified on npm on 2026-10-09. It fixes Bitmap/Image
repeat and clip in WebGL, Canvas and nested bitmap caches. Repeat retains original
texture periods, trim margins, rotated atlas regions and clipped edge tiles;
nine-slice applies only to scale. See packages/core/docs/bitmap-fill.md.
No API/resource/KUI/dependency migration or dependent SDK bump is required.
UI 3.3.0/runtime 0.9.0 and Game/DragonBones/Spine peers accept it. Current
UI 3.4.0/runtime 0.10.0 require Core ^2.4.0, which includes the correction. Editor 0.23.2
installs exact registry Core 2.3.3 with a matching Bun lock, replacing 0.23.1's
explicit local trial binding. Ordinary builds need no local engine checkout.
Templates, examples and Reskin are unchanged; their compatible installations
may adopt the patch separately. Source versions never confirm publication.

Core 2.3.1 and UI 3.3.0 are published.
UI 3.3.1 is preserved in commit 60e6404, not published. It contains the transformed-layout correction in
`packages/ui/src/kurot/core/fit-transformed-bounds.ts` and UIState. It applies
parent allocations to flipped/scaled/rotated/skewed components and tracks the
affected local axes. Published UI 3.3.0 still falls back to preferred dimensions
for non-identity transforms. Only the UI patch version changes for this repair. Peer ranges and application
locks are unchanged. The correction is also included in published UI 3.4.0;
adopting that release requires Core ^2.4.0.
Centered flipX/flipY are published in Core 2.4.0, UI 3.4.0 and document 0.13.0.
CLI 3.5.0 and runtime 0.10.0 are also published and consume those releases.
Read docs/centered-flips.md for Core 2.4.0/UI 3.4.0/document 0.13.0/CLI 3.5.0/
runtime 0.10.0 requirements and the temporary-test/registry-lock boundary.
Negative scale continues to use the existing anchor transform.
Core 2.3.2 is published. It fixes TextField outline clipping using render-only
stroke margins in Canvas/WebGL, caches and effect captures, without changing
layout or input/external clip boundaries; see packages/core/docs/text-layout.md.
It is not included in published Core 2.3.1. No API migration, dependency-range
change or dependent SDK bump is required. UI 3.3.0/runtime 0.9.0 and
Game/DragonBones/Spine peers accept 2.3.2; current UI 3.4.0/runtime 0.10.0
require Core ^2.4.0, which includes the fix. Development locks may adopt accepted
versions separately.
Editor 0.22.1's local trial pins published Core 2.3.2 with an updated Bun lockfile.
Reskin, templates and examples receive the correction only after an explicit
installation/lock update and rebuild;
legacy Core 1.x projects remain unaffected.
Core 2.3.1 fixes an unstyled blank run borrowing a later rich run's size.
It introduces no API requirement; published UI 3.3.0 retains Core ^2.3.0. Core adds pure
TextField.measureText and fixes rich-run line heights and clearing rich styling
with an identical plain string. UI adds independent RichLabel (textFlow only)
and fixes BitmapLabel automatic maxWidth measurement; its peer minimum is
Core ^2.3.0 and development baseline is ^2.3.1. The UI 3.3.0 registry baseline
installs Core 2.3.1 from npm with a matching
registry lockfile without local overrides. UI 3.2.0/runtime 0.8.2 and
Game/DragonBones/Spine peers accept 2.3.0 without SDK bumps. KUI/document,
ui-document 0.12.0, CLI 3.4.0 and ui-runtime 0.9.0 are published with the
matching authoring, compilation and materialization contracts. Editor adoption
is explicit; templates and other projects are unchanged.
See packages/ui/docs/rich-label.md. Latest published versions are Core 2.5.1
and UI 3.4.0; source versions do not establish npm publication.

ui-document 0.12.0 is published. It adds independent
BitmapLabel/RichLabel catalog entries, typed bitmap-font references and literal
textFlow Span property elements, including named states, without changing format 2.
Read packages/ui-document/docs/text-components.md. Published CLI 3.3.1 and
ui-runtime 0.8.2 still use ^0.11.0 and do not support these built-in types.
CLI 3.4.0 and ui-runtime 0.9.0 are published with native
BitmapLabel/RichLabel compilation and materialization. CLI depends on published
ui-document ^0.12.0; runtime requires Core ^2.3.0, UI ^3.3.0 and document ^0.12.0.
Editor 0.22.1's local trial adopts this published chain and replaces its private
BitmapLabel catalog/adapter with the native font contract. It adds BitmapLabel
and RichLabel authoring, scoped bitmap-font refresh and native rich-text editing.
These local trial changes do not publish a desktop release or upgrade external projects.
Other SDKs, templates and examples are unchanged. Older CLI/runtime locks remain
valid for their existing features; adopting these new text types requires explicit
upgrades. Core 2.3.1 is an optional patch over the runtime minimum 2.3.0.

Core 2.2.1 is published. It fixes minified TextField dictionary
and emergency wrapping and protects complete graphemes in both wrapping modes.
It retains Unicode 17.0, the pinned linebreak dependency and UTF-16 input offsets.
UI 3.2.0/runtime 0.8.2 and Game/DragonBones peers accept this patch; installed
and locked Core versions must be updated to receive it. Current UI 3.4.0/runtime
0.10.0 require Core ^2.4.0, which includes the correction.
Core 2.2.0 is published with bitmap-font ^0.1.0 and no local dependency override.
It adds font resources and native BitmapText rendering. UI 3.2.0 is published
with BitmapLabel and Core ^2.2.0 in peer/dev dependencies, without local overrides.
Published UI 3.1.0 requires Core
^2.1.0 and does not contain BitmapLabel. KUI/Editor adoption is separate.
Game 2.0 declares Core 2.x.
The separate Kurot-Spine repository publishes Spine 4.0–4.2 adapter 0.2.1 and
Spine 4.3 adapter 0.3.1 with peer ^1.0.16 || ^2.0.0 and development ^2.2.1.
Publication was verified on npm on 2026-10-08. Packed adapters pass
type/behavior/browser checks on Core 1.0.16, 2.0.0 and 2.2.1. Earlier
0.2.0 / 0.3.0 declare only ^1.0.16, which excludes Core 2.x. Reskin and
the copied Tentax project accept the Spine 4.0 patch through ^0.2.0. Update their
installations/locks and rebuild when adopting it; no unrelated SDK bump is needed.
Templates/tentax now declares Core ^2.2.1, UI ^3.2.0 and Spine 4.0 ^0.2.1;
its lockfile and installation resolve those published versions with one shared Core.
ui-runtime 0.8.2 requires Core ^2.1.0, UI ^3.1.0 and ui-document ^0.11.0.
CLI 3.3 requires ui-document ^0.11.0.
CLI 3.3.1 is published with whole-resource dev synchronization,
including Core-only projects, without adding an atlas dependency. Installed CLI
3.3.0 does not include these watcher fixes. Source versions do not confirm npm
publication. Engine examples and the KUI sample install CLI 3.3.1 from npm;
the Editor working tree uses CLI 3.5.0. Legacy EXML projects remain on CLI 1.3.x. See
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
UI 3.1.0/runtime 0.8.2 and Game peers accept this patch. Current UI 3.4.0/runtime
0.10.0 require Core ^2.4.0, which includes the correction.
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
6. Find direct package dependants and classify required compatibility migrations,
   optional installed/development lockfile adoption, and unaffected consumers.
   Report peer, development, template, example and application requirements.
   Compatible older locks are not a reason to bump dependent SDK versions.
   Follow `docs/dependency-policy.md`; do not silently bump unrelated packages.
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
ui-runtime 0.8.1. The Label preset integration originally used document 0.11.0
and CLI 3.3.0. Current CLI 3.6.0/runtime 0.10.0 require document ^0.13.0;
CLI-built skins do not require ui-runtime.
Engine examples use CLI 3.3.1, while legacy EXML projects keep their independent
dependency set. Editor 0.19.2 adopted document 0.11.0, CLI 3.3.0 and
runtime 0.8.2; its 0.19.3 snapshot pinned CLI 3.3.1. The current Editor working
tree uses Core 2.5.1/UI 3.4.0/document 0.13.0/CLI 3.6.0/runtime 0.10.0.
Existing signed installers are not
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
