# Release and adoption history: early Core 2.x

These records were moved from the root AGENTS.md on 2026-10-18. Publication
checks and application adoption describe the recorded release, not the current
state of every checkout. Read the target project's manifest, lock and installed
packages for its actual versions; source versions alone do not establish npm
publication. Bare package paths below are relative to the repository root.

For current dependency rules read [dependency policy](dependency-policy.md).
Consult package docs for current APIs and migration contracts.

Later releases: [Core 2.4–2.5 history](release-history.md).

## Recorded early 2.x releases

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
See packages/ui/docs/rich-label.md. Latest published versions are Core 2.5.4
and UI 3.6.0; source versions do not establish npm publication.

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
see [`packages/ui-document/docs/resource-nine-slice.md`](../packages/ui-document/docs/resource-nine-slice.md).

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
tree (Editor 0.28.5) uses Core 2.5.4/UI 3.6.0/document 0.13.1/CLI 3.6.0/runtime 0.10.0.
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
