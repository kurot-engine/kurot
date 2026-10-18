# Release and adoption history: Core 2.4–2.5

These records were moved from the root AGENTS.md on 2026-10-18. Publication
checks and application adoption describe the recorded release, not the current
state of every checkout. Read the target project's manifest, lock and installed
packages for its actual versions; source versions alone do not establish npm
publication. Bare package paths below are relative to the repository root.

For current dependency rules read [dependency policy](dependency-policy.md).
Consult package docs for current APIs and migration contracts.

Earlier Core/text/style records: [early 2.x history](release-history-early-2x.md).

## Recorded releases and adoption

### UI authoring and CLI declaration patches — 2026-10-18

[CLI 3.6.1](https://registry.npmjs.org/@kurot%2fcli/3.6.1) is published. Its latest
tag, downloaded tarball and SHA-512 integrity are verified; all 234 files match
prepared commit 46459e97. Both game/empty templates contain README/AGENTS entry
docs, and the compiled generator emits getter-based host skinParts declarations
compatible with skipLibCheck=false. Runtime Skin output is unchanged.

UI 3.6.2 contains the standard production workflow, directory conventions and
complete ScoreHUD recipe. The user reported publication, but public npm checks
at 2026-10-18 14:03 UTC return [latest=3.6.1](https://registry.npmjs.org/@kurot%2fui/latest)
and HTTP 404 for the exact 3.6.2 version, including a fresh query. Its registry
publication remains unconfirmed; this record does not establish publication
failure or a different registry's state. Use the repository guides while the
intended installation source is being confirmed.

Kurot-Studio adopts exact registry CLI 3.6.1 in commit 048e5c1, updating only its
CLI pin and corresponding lock version/integrity. All other direct and transitive
dependency resolutions remain unchanged. Offline frozen installation with
lifecycle scripts disabled, the Host/renderer/preload build, complete format/
code-rule/boundary/type checks and 175 test files / 1,451 tests pass. Its real
CLI development and release integration baselines now check 3.6.1. Existing games
keep their own CLI installations. The application is not published or pushed.

Core/UI implementations and engine dependency ranges/locks are unchanged.
Other SDKs and applications retain their own adoption schedules. Published
archives retain their preparation-time documentation; these post-publication
status updates apply to the repository and do not replace an npm artifact.
See [dependency impact](api-documentation.md#ui-362-and-cli-361-authoring-patches)
and [verification](../tools/api-docs/VERIFICATION.md).

### API documentation patches — 2026-10-18

Published versions and their registry latest tags were verified on 2026-10-18:

| Registry version | Bundled API files | Checked content |
| --- | ---: | --- |
| [Core 2.5.5](https://registry.npmjs.org/@kurot%2fcore/2.5.5) | 2,552 | API reference and game-authoring guide |
| [Game 2.0.1](https://registry.npmjs.org/@kurot%2fgame/2.0.1) | 560 | API reference and public docs/ packaging |
| [UI 3.6.1](https://registry.npmjs.org/@kurot%2fui/3.6.1) | 5,165 | API reference and JSDoc examples |

All three downloaded tarballs pass their registry SHA-512 integrity check.
Every API file matches commit d081f6a byte-for-byte; each archive includes public
declarations and excludes engine src/. No consumer source, peer minimum or
dependency lock change is required to read these references. These checks do
not update application installations or publish any further package.

The standard UI authoring guide and ScoreHUD recipe were added to the repository
after UI 3.6.1 publication, so they are not inside that archive. Published CLI
3.6.0 was latest at that earlier check, and its downloaded game template contains
neither the newly added README nor AGENTS.md. Those future template docs need a
separate CLI release to reach new scaffolds; existing projects need their own
instruction entry. The CLI download also passes its registry integrity check.

Core 2.5.4 is published, verified on npm on 2026-10-12, including latest, package
download, registry integrity and all 628 generated files matching the tested
build. It fixes continuous
SoundChannel Web Audio loops, including finite counts on the audio clock, initial
offsets, position and cleanup. Existing `loops` semantics are preserved.
HTML unlimited fallback uses native looping; finite fallback remains browser-timed.
Published 2.5.3 lacks this correction. SDK dependency ranges and development locks
are unchanged; existing peers accept 2.5.4 without dependent SDK bumps or raised
minima. Editor 0.28.5 uses exact registry Core 2.5.4 with a matching Bun lock and
rebuilt local trial App; no remote release is initiated. Reskin and the selected
Templates/tentax and Templates/milf-master adopt ^2.5.4 with matching registry
installations/locks and rebuilt outputs. The demo/game examples also adopt ^2.5.4
and rebuild; other SDK and independent Reskin project installations are unchanged.
Tentax's unchanged MP3 and music manager were verified through an isolated checkout
bundle; its newly minified release is checked against repeated decoded samples.
Read packages/core/docs/audio-playback.md.

UI 3.6.0 is published, verified on npm on 2026-10-11, including latest, package
download, integrity and all 344 generated files matching the tested build. It reserves
outline-safe Label layout space, including automatic dimensions, wrapping and
fitting. Outlined Label sizes and line breaks can change; use explicit top for
progressively typed dialogue. The Core peer/dev range rises from ^2.4.0 to ^2.5.2
for public line ink metrics and unified glyph-block alignment. UI development
installs registry Core 2.5.3 with a matching lock; the 2.5.2 minimum is tested
separately. Core, CLI and ui-document need no new release. Runtime 0.10.0's
peer/dev UI ^3.4.0 already accepts 3.6.0, provided its host satisfies UI's Core peer.
Editor 0.28.3 adopts exact registry UI 3.6.0 with a matching Bun lock and ordinary
local App build. The explicitly selected Templates/tentax and Templates/milf-master
adopt ^3.6.0 with matching registry installations/locks and rebuilt outputs.
The game example's existing range accepts it; its installation/lock and other
SDK development locks are unchanged. Reskin has no
direct UI dependency. The MilfMaster harness can substitute a test bundle via
--ui-trial without modifying dependencies.

UI 3.5.0 is published, verified on npm on 2026-10-10, including latest, package
download and registry integrity. Its Label fitting/alignment modules match the
published build.
The published 3.5.0 baseline extends Label shrink
to complete multiline layouts, with outline allowance, stable alignment frames,
nominal automatic dimensions and unchanged authored line modes. Published UI
3.4.0 remains single-line only. Core peer ^2.4.0, APIs, KUI/resource formats and
other SDK versions are unchanged. Published 3.5.0 developed against Core 2.4.0.
Runtime 0.10.0's peer/dev UI ^3.4.0 accepts 3.5.0 without a new SDK release.
The game example (^3.1.0) may update its installation/lock and rebuild separately.
At the 3.5.0 adoption, Templates/tentax and Templates/milf-master declared
UI ^3.5.0, with matching registry installations/locks and rebuilt outputs.
CLI's new-game template resolves latest on create; existing projects are unchanged.
Editor 0.28.2 is a local trial with its Inspector restriction removed and fitting
alignment corrected. Its installation/lock and ordinary App build use exact
registry UI 3.5.0 and one Core 2.5.3; the temporary UI source binding is removed.
Other applications and SDK development locks retain their own installations.
Core-only SDKs, the document kernel, CLI and independent
Reskin projects need no release. Read packages/ui/docs/label-text-layout.md and
docs/dependency-policy.md for required versus optional consumer adoption.

Core 2.5.3 and ui-document 0.13.1 are published, verified on npm on 2026-10-10. TextField
and BitmapText now default to middle, inherited by Label, RichLabel, BitmapLabel
and EditableText. Explicit top/bottom and state overrides remain effective;
multiline controls only line generation. Dynamic alignment uses the existing
unified glyph block; input retains stable editing rows and overflow scrolling.
BitmapText retains bitmap-font line metrics. The headless catalog records middle
for all four UI text types without inserting omitted properties into XML.
Use explicit top for content intended to begin at the top of a taller box.
UI/Game/DragonBones/Spine/ui-runtime peers accept Core 2.5.3; no new SDK versions
or higher minima are required. CLI 3.6.0/runtime 0.10.0 already accept document
0.13.1 through ^0.13.0. Their development locks are unchanged. Editor 0.27.5,
Reskin, Tentax and MilfMaster explicitly install registry Core 2.5.3 and document
0.13.1 with matching locks and rebuilt outputs. Editor removes its rich-text top
fallback and restores the native instance default; 0.27.5 is a local trial, not a
remote release. Other applications and independent Reskin projects are unchanged.
Atlas and the bitmap-font kernel are unchanged.
Read packages/core/docs/text-layout.md and packages/ui-document/docs/text-layout.md.

Core 2.5.2 is published; npm latest, package download and registry integrity
were verified on 2026-10-10. Its alignment/rendering modules match the tested
local build. Dynamic top/middle/bottom now share one
complete glyph block, independent of multiline. Input uses stable nominal editing
rows in all modes; overflowing input remains top-aligned for caret scrolling.
Nominal measurements and public/dependency/XML contracts are unchanged. In 2.5.2,
TextField and ordinary Label default to top; button caption skins explicitly use middle.
Dynamic top/bottom captions can move from 2.5.1. Existing UI/Game/DragonBones/Spine/
ui-runtime peers accept the patch without new SDK versions or higher minima.
At the 2.5.2 adoption, Editor 0.27.4, Reskin, Tentax and MilfMaster installed
registry Core 2.5.2 with matching locks and rebuilt outputs. Editor 0.27.4
was committed and its release tag pushed; CI completion was not awaited. Read packages/core/docs/text-layout.md. UI/CLI/headless
packages require no release. MilfMaster's omitted button caption alignments are
now explicitly middle, including ButtonPlainBlueSkin.

Core 2.5.1 is published; npm latest, package download and registry integrity
were verified on 2026-10-10. Its published block-alignment modules match the
tested local build. Dynamic middle alignment centers the complete glyph block
independently of multiline, retaining blank rows and relative row baselines/spacing. INPUT uses
stable editing rows; top/bottom and nominal measurements are unchanged. Block
bounds are cached with the line layout and shared by drawing, link hits and
render padding. Read packages/core/docs/text-layout.md. No public API, dependency
or XML/resource-format change is required. SDK peers accept this patch without
new versions. At the 2.5.1 adoption, Editor 0.27.3, Reskin, Tentax and
MilfMaster installed registry Core 2.5.1 with matching locks and rebuilt
outputs. Editor 0.27.3's release tag has been pushed; CI completion was not
awaited. Other SDKs and CLI are unchanged. Other
applications and independent Reskin projects retain their own installations.

Editor 0.27.5, Reskin and the explicitly selected Templates/tentax and
Templates/milf-master now install registry Core 2.5.3/document 0.13.1 with matching app locks.
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
