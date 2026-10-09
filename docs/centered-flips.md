# Centered display flips

Core 2.4.0, UI 3.4.0, ui-document 0.13.0, CLI 3.5.0 and ui-runtime 0.10.0
are published, verified on npm on 2026-10-09. UI/CLI/runtime development installs
the relevant registry packages and records them in pnpm-lock.yaml without local overrides.

`flipX` and `flipY` are independent boolean DisplayObject properties, defaulting
to false. They mirror content across the horizontal or vertical center of its
local frame before the authored scale, rotation and skew. Position, anchors and
scale values are preserved. Negative scale retains its existing origin-based
meaning; combining it with a flip composes both transforms.

```ts
image.flipX = true;
image.scaleX = 0.5; // The horizontal reflection remains enabled.
```

Ordinary Core display objects use their local content bounds, including a
nonzero bounds origin and child content. UI Group and all Component subclasses
use their validated unscaled layout rectangle, including empty space. A
scrollRect uses its visible viewport as the reflection frame; scrolling still
translates the content within that fixed viewport. External masks retain their
existing independent coordinate space.

UI layout remains deferred. Validate the component before reading coordinates
or rendering manually. Percentage and edge allocation, intrinsic sizes, anchor
positions and parent layout bounds remain independent of centered flips.
Resizing updates the reflection center. Nested flips compose normally.

Rendering, localToGlobal/globalToLocal, hit tests, display-list caches, effects
and render groups consume the same effective transform. `matrix` stays the
copy of the authored transform without flips or anchor/scroll offsets; assigning
it preserves both flags. Internal `$getMatrix()` includes the reflection and
anchor compensation. Custom rendering integrations must use the effective
matrix's translation instead of assuming that it equals x/y.

```xml
<Skin xmlns="https://kurot.dev/ui/1" class="ui.FlipExample" states="down">
    <Image id="background" width="100%" height="100%"
           flipY="true" flipY.down="false" />
</Skin>
```

Flags are inherited from the headless DisplayObject catalog, use real booleans,
and support normal state/history/data-binding restoration. CLI rejects malformed
values and flags on the nonvisual Skin root. No existing negative-scale XML is
converted automatically. The document format remains version 2.

## Dependencies and adoption

| Package | New requirement | Why it changes |
| --- | --- | --- |
| Core 2.4.0 | bitmap-font remains ^0.1.0 | Owns the new display transform API. |
| UI 3.4.0 | Core ^2.4.0 | Supplies the actual layout frame through the new hook. |
| ui-document 0.13.0 | None | Exposes shared boolean authoring metadata. |
| CLI 3.5.0 | ui-document ^0.13.0 | Parses and validates the new attributes/states. |
| ui-runtime 0.10.0 | Core ^2.4.0, UI ^3.4.0, document ^0.13.0 | Applies native flags and restores them transactionally. |

These are changes to shipped APIs/contracts, not automatic dependent version
bumps. Game, DragonBones, Spine, bitmap-font and atlas are unchanged; their Core
2.x peers already accept 2.4.0. Other applications/templates retain their existing dependency baselines.
Consumers that need the feature explicitly adopt the relevant new versions and
rebuild. CLI-built games do not need ui-runtime.

All five SDK releases are published. CLI installs document 0.13.0; runtime
installs Core 2.4.0/UI 3.4.0/document 0.13.0 with one shared Core. The targeted
registry locks match the manifests and support frozen installation. Runtime does
not depend on CLI. Registry integrities come from npm, and unrelated tooling
resolutions remain unchanged.

Editor 0.24.0 explicitly adopts the five registry SDKs with exact dependencies
and a matching Bun lockfile. Shared Inspector fields/icons use native preview,
XML saving and document history; reparenting guards protect parent reflections.
Its local trial App is built separately from existing signed installers.
External projects adopt their own CLI/Core/UI versions when using the flags.

## Verification

The initial source-chain checks passed all package builds and 1,570 unit tests
(Core 842, UI 327, document 223, CLI 102, runtime 76). UI registry adoption on
2026-10-09 passes a frozen install, build, all 327 unit tests and the three
Canvas/WebGL 1/WebGL 2 pixel regressions against published Core 2.4.0. CLI and
runtime registry adoption on the same date passes frozen installs, both builds,
102 CLI tests and 76 runtime tests using the published upstream chain. Dependency
inspection confirms one shared Core in runtime/UI. The earlier source trial
passed Editor type checks, 66 focused unit tests and one Electron edit/save/undo/redo check.
Editor 0.24.0 registry adoption passes frozen installation, all three TypeScript
environments, module boundaries, 66 focused unit tests (509 assertions), and
local macOS arm64 packaging. The final App passes one desktop interaction
covering Inspector fields, unchanged layout frames, mirrored compositor pixels,
XML saving, native menu undo/redo and Design/Preview consistency. Its version,
SDK dependency records and strict code-signature check are verified.

Native Core/UI unit tests cover nonzero bounds, signed scale, rotated/skewed
anchors, matrix round trips, defaults, input coordinates, scroll viewports,
parent content changes, all common UI bases and popup reparenting. Headless,
compiler and runtime tests cover booleans, states, undo/redo and typed data.
Minified browser tests exercise Canvas, WebGL 1 and WebGL 2 with asymmetric
pixels, percent resizing, sparse parent frames, native clips, ancestor/self
caches and render groups. GPU assertions read the current framebuffer directly.

The initial source checks used explicitly recorded temporary local SDK bindings,
restored afterward. UI now builds/tests against published Core 2.4.0 and its
matching registry lockfile. CLI/runtime verify their releases against the published upstream chain and
matching registry locks. Editor adopts the chain explicitly; unrelated
application dependencies are unchanged. See each package changelog for exact results.
