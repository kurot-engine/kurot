# Verification — 2026-10-07

Environment: Node 26.10.0, pnpm 12.9.1, TypeScript 5.9.3, Vitest 3.2.7,
Core 2.1.1 and Tabbit Chromium WebGL.

## Unit tests

The 19 tests cover ESM isolation; atlas UV / pivot / trim / rotation; armature
scale; unweighted deform; weighted mesh coordinates; nested disposal; frame /
sound / complete events; listener ownership and scalar snapshots; color factors;
one ticker registration per factory; time units and driver switching; disposal
inside callbacks; cache protection; borrowed textures; replacement atlases;
hidden attachments and custom displays.

## Original project resources

Input: the `resource/assets/texture/armature` directory in MilfMaster-Slot-01.
Resources were read without being copied into the library. All original
skeletons use DBDT binary data with JSON header format version 5.5.

| Metric                              |     Count |
| ----------------------------------- | --------: |
| Armatures                           |       159 |
| Animations                          |       397 |
| Animation frame samples             |    78,964 |
| Visible attachment geometry samples | 1,823,209 |
| Complete events                     |       397 |
| Initially weighted mesh slots       |     3,284 |
| Initially unweighted geometry slots |        90 |

Each animation advances through one full cycle at approximately 60 Hz, checking
finite Mesh coordinates, UVs and matrices, and valid triangle index ranges.
After disposal, checks confirm an empty factory display count and display tree,
with atlas pages still alive. This does not compare pixels with the original
Egret renderer or verify every character's artwork and application flow.

Reproduce from the package directory with
`pnpm verify:project /path/to/resource/assets/texture/armature`.

## Browser

A synthetic four-color atlas covers ordinary, rotated, trimmed, unweighted
deform, weighted and nested attachments. WebGL Player and CanvasRenderer draw
the same scene side by side. Image inspection passed; RGBA values at eight
interior points across ordinary and rotated attachments matched exactly.
The original project's UI `110_ske.dbbin` / `110_tex.json` / `110_tex.png` assets
were loaded, and the gift shake animation appeared consistently on both backends.
The final page had no script errors. After all factories were disposed,
displayCount=0, all sampled pixels on both backends were transparent and both
canvases were clear.

Surface and color-offset filter image regressions, and visual comparisons of all
characters against the old Egret renderer, remain uncovered. Core's existing
Canvas contract does not execute GPU filters.

## Build and distribution

The runtime TypeScript source was converted from namespaces to ESM and compiled
directly with the adapter under one strict configuration. All 96 original
runtime exports remain available. Original commit/source hashes record
provenance and are not used to validate adapted source against old hashes.
Typechecking includes tools, examples and tests. Distribution checks used a
local tarball without running npm publish.

Final results: `pnpm build`, `pnpm typecheck`, all 19 Vitest tests, project
resource verification and `git diff --check` exited with code 0.
The tarball produced from direct source compilation contains 197 files and 39
runtime ESM modules, retains declarations, provenance records and MIT notices,
and excludes tests, examples and game images.
An independent temporary consumer installed Core 2.1.1 and this library 0.1.0
from the tarball. The ESM root and runtime subpath shared the same runtime constructors;
native Mesh and disposal checks passed, as did NodeNext / strict typechecking.

The direct-source implementation reran all resource checks, UI / pixel / disposal
checks on both backends and the independent tarball installation check.
`src` contains no JS or `.d.ts`; tests and examples run TS directly.

## Release revalidation — 2026-10-08

The development dependency now installs published Core 2.2.0 from npm, with
no local overrides. The runtime peer minimum remains Core ^2.1.1. Runtime and
adapter source are unchanged from the original verification above.

With Core 2.2.0, `pnpm build`, `pnpm typecheck` and all 19 Vitest tests passed.
Project-resource verification reproduced all 159 armatures, 397 animations,
78,964 frame samples and 1,823,209 visible geometry samples, including the
disposal and borrowed-atlas checks.

A fresh temporary consumer installed the release tarball alongside registry
Core 2.2.0. NodeNext / strict typechecking with skipLibCheck=false passed.
The ESM root and runtime subpath shared Armature and BaseObject constructors.
The original UI 110 animation produced four native Mesh attachments; finite
geometry, clock updates, repeated disposal and borrowed-page ownership passed.

The release archive retains 197 files and 39 runtime ESM modules, declarations,
provenance and MIT notices. It excludes source, tests, examples, tools and game
images. README and CHANGELOG now use English and document registry installation
and the published Core/UI versions. Browser image results above retain their
original Core 2.1.1 environment.
