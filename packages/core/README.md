# @kurot/core

TypeScript / ESM / ES2022 display, rendering, events, text, resources and media
for browser games. Package version: **2.6.0** (published).

Start with the [game authoring guide](docs/game-authoring.md),
[API topics](docs/api/topics.md) or [symbol index](docs/api/index.md). Read only
the relevant symbol/member pages; installed packages include public declarations
and docs without requiring the engine source.

| Contract | Guide |
| --- | --- |
| Text wrapping, alignment, measurement and fonts | [Text layout](docs/text-layout.md) |
| Texture units, density and atlas frames | [Texture density](docs/texture-density.md) |
| Bitmap scale, repeat and clip | [Bitmap fill](docs/bitmap-fill.md) |
| Audio time units, loops and channel cleanup | [Audio playback](docs/audio-playback.md) |
| Resources, manifests and errors | [Resource loading](docs/resource.md) |
| Shader and filter ownership | [Filters](docs/filters.md) |

## Installation

The package includes the generated API reference and game authoring guide.
Canvas stage-attribute startup requires Core >= 2.6.0 within 2.x.

```bash
pnpm add @kurot/core@^2.6.0
```

Core depends on `@kurot/bitmap-font ^0.1.0` for bitmap-font data and shared
layout. Package installation resolves this dependency from npm. Install other
Kurot packages separately when the application needs their capabilities.
UI provides BitmapLabel when the application needs native bitmap-font UI layout.

## Features

**Rendering Engine**

- WebGL-first with automatic Canvas 2D fallback when WebGL initialization fails
- High-DPI backing stores and resolution-aware WebGL text and vector graphics rasterization
- WebGL-only InstructionSet pipeline (Build → Execute two-phase, inspired by Pixi.js 8)
- Multi-texture batching (up to 8 textures per draw call)
- RenderGroup layers — localize instruction rebuilds to the affected subtree
- Filters: Blur (ping-pong dual-pass), Glow, DropShadow, ColorMatrix, custom shaders
- Masks: automatic selection between scissor / stencil / offscreen compositing, including nested scroll clips
- PixiJS-style `cacheAsTexture()` plus Egret-compatible `cacheAsBitmap`
- WebGL Context Lost recovery

**Display Objects**

- Full scene graph: DisplayObject → Container → Sprite → Stage
- Independent centered `flipX`/`flipY`, preserving authored position, scale and
  anchors; shared rendering/input transforms and subclass reflection-frame hook.
- Bitmap (with scale9Grid), Shape, Mesh, TextField, BitmapText, Video
- Graphics vector drawing (rect, circle, ellipse, arc, bezier, gradients, dashed lines)
- cacheAsBitmap / cacheAsTexture, tint, skew, zIndex sorting

**Event System**

- Egret-compatible event classes: Event, TouchEvent, TimerEvent, ProgressEvent, etc.
- Capture / bubble two-phase dispatch, object pooling, `once()` built-in
- Unified touch + mouse handling, multi-touch support

**Other**

- 7 screen scale modes (showAll / noScale / exactFit / noBorder, etc.)
- Resource manager — async/await loading, group-based batching, 6 built-in parsers (Image / Json / Text / Sound / Sheet / Font)
- HttpRequest / ImageLoader networking
- Sound (Web Audio + HTML Audio fallback) / Video playback
- ByteArray / Timer / Logger / FontManager / LocalStorage
- Full `strict: true` TypeScript across runtime APIs

### Rendering Backends

`Player` tries `webgl2` and then `webgl` directly on the supplied canvas. If both context types fail to initialize, it falls back to the Canvas 2D renderer. No temporary canvas is created solely to probe WebGL support.

```typescript
const app = createPlayer({ canvas });
console.log(app.player.isWebGL ? 'WebGL' : 'Canvas 2D');
```

The flat InstructionSet pipeline and multi-texture batching apply to the WebGL backend. The full-scene Canvas fallback uses direct display-tree traversal. Canvas support is still part of the normal WebGL path: text, Graphics, RenderTexture, and pixel hit testing may be rasterized through Canvas before being uploaded or composited by WebGL.
Bitmap nine-slice rendering also works in Canvas, including WebGL
`cacheAsBitmap` subtrees that use Canvas for their offscreen texture.

**Migrating from Egret (1.0.0 breaking changes)**

- `.hashCode` and the `HashObject` base class were removed. Use `WeakMap`-keyed lookups or `===` for object identity instead of comparing integer hash codes. Internal consumers were migrated to `WeakMap` in 0.6.3.
- `Resource.instance` (singleton getter) was removed — import the shared `resource` instance directly: `import { resource } from '@kurot/core'`.
- The multi-Player listener registration API on `DisplayObject` / `DisplayObjectContainer` (`addStructureChangeListener` / `addRenderableDirtyListener` / `addContainerStructureChangeListener`) was removed — the engine is single-Player by design.
- `WebGLRenderContext.getInstance()` / `resetInstance()` were removed — `Player` constructs the context directly.
- Internal fields were renamed with a `$` prefix (e.g. `$x`, `$y`, `$renderDirty`) to separate engine state from public API.
- Vendor-prefixed fallbacks (`experimental-webgl`, `webkitAudioContext`, `webkit/moz fullscreen`) and the hand-rolled base64 implementation were removed in favour of native APIs.

**vs. Egret**

| Aspect      | Egret             | Kurot                   |
| ----------- | ----------------- | ----------------------- |
| Code size   | 42,340 lines      | ~18,500 lines           |
| Modules     | `namespace egret` | ES Module               |
| Type safety | pervasive `any`   | `strict: true`          |
| Target      | ES5               | ES2022                  |
| Pipeline    | RenderNode tree   | Flat InstructionSet     |
| Batching    | same-texture      | multi-texture (8/batch) |

**Design Credits**

The rendering pipeline borrows concepts from Pixi.js 8 while keeping the Egret display object model and API intact:

| Aspect                                | Source    | Notes                                                           |
| ------------------------------------- | --------- | --------------------------------------------------------------- |
| InstructionSet + RenderPipe two-phase | Pixi.js 8 | Build → flat instructions, Execute → dispatch by `renderPipeId` |
| RenderGroup layers                    | Pixi.js 8 | `isRenderGroup` isolates subtree instruction sets               |
| Multi-texture batching                | Pixi.js   | `aTextureId` per vertex, up to 8 textures per draw call         |
| Tint                                  | Pixi.js   | `displayObject.tint` passed as premultiplied vertex color       |
| Dirty flag separation                 | Pixi.js 8 | `structureDirty` (rebuild) vs `renderDirty` (patch)             |
| Display objects / events / API        | Egret     | Fully preserved for minimal migration cost                      |
| Filter shaders                        | Egret     | Original GLSL, blur upgraded to ping-pong dual-pass             |
| WebGL state management                | Egret     | DrawCmdManager batching command queue                           |
| Mask strategies                       | Egret     | scissor / stencil / offscreen compositing                       |

## Quick Start

For a complete gameplay loop, read the [game-authoring guide](docs/game-authoring.md)
and the repository's [Star Catcher reference project](../../examples/star-catcher/README.md).

```typescript
import { createPlayer, Sprite, Shape } from '@kurot/core';

const app = createPlayer({
	canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
	frameRate: 60,
	scaleMode: 'showAll',
	contentWidth: 640,
	contentHeight: 1136,
});

const root = new Sprite();
app.start(root);

const rect = new Shape();
rect.graphics.beginFill(0xff0000);
rect.graphics.drawRect(0, 0, 100, 100);
rect.graphics.endFill();
rect.x = 100;
rect.y = 100;
root.addChild(rect);

// stop() pauses this Player's rendering; the shared ticker can keep running.
// Clean up application-owned activity before final app destruction.
// app.destroy();
```

`createPlayer()` automatically uses the device pixel ratio, capped at `2`.
Stage defaults can also come from canvas attributes emitted by the CLI; see
[stage configuration](docs/stage-configuration.md) for precedence, validation
and the Core >= 2.6.0 requirement.
Pass `resolution` explicitly when a project needs a different sharpness and
GPU-memory tradeoff. Individual `TextField` instances can also override their
raster density through `textField.resolution`. The value can be changed while
the application is running through `app.screenAdapter.resolution`; automatic
text and `cacheAsTexture(true)` caches will be regenerated at the new density.
WebGL vector graphics are also re-rasterized when their display scale increases;
their cached sampling scale is capped at 8× to bound zoom-related memory use.

The Core 2.5.0 [texture density API](docs/texture-density.md) adds independent
source density through `new Texture(2)` and sheet JSON `resolution: 2`.
High-density images retain logical dimensions and nine-slice corners while
sampling physical atlas pixels.

## Multilingual text

`TextField.wordWrap = true` uses Unicode 17.0 UAX #14, with dictionary
segmentation for complex-context scripts and alphabetic overflow wrapping.
Automatic wraps consume separator spaces without painting them at the start
of the next line. Original text and UTF-16 input offsets are preserved.
Non-breaking spaces and punctuation keep their Unicode constraints.
See [text layout](docs/text-layout.md) for the profiles and conformance tests.

## Development

```bash
pnpm install
pnpm run build        # compile
pnpm run test         # run tests
pnpm run dev          # watch mode
```

## Documentation

- [Game authoring](./docs/game-authoring.md) — short consumer path through input, time, rules, restart, cleanup and acceptance checks
- [CHANGELOG.md](./CHANGELOG.md) — versioned release notes, including the full list of 1.0.0 breaking changes
- [Architecture](./docs/architecture.md) — engine structure and rendering pipeline
- [Resource system](./docs/resource.md) — resource configuration, loading, and lifecycle
- [Bitmap fonts](./docs/bitmap-fonts.md) — supported descriptors, native rendering, metrics and ownership
- [Live demo](https://irwinmc.github.io/kurot-demo/) — interactive rendering examples

## Test Pages

Interactive test pages in `examples/` require an HTTP dev server (ES Modules don't work over `file://`):

```bash
pnpm benchmark
```

| Page            | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| **Visual Test** | 19 cases: Shape, Graphics, Filters, Mask, RenderGroup, Animation      |
| **Bitmap Test** | Bitmap rendering: scale, rotation, SpriteSheet, scale9Grid, batching  |
| **Mesh Test**   | Mesh deformation: Quad / Fan / Grid presets, Wave / Ripple / Twist    |
| **Sound Test**  | Sound / SoundChannel: load, play, volume, loop, error handling        |
| **Video Test**  | Video: load, play/pause, seek, volume, resize                         |
| **Net Test**    | HttpRequest / ImageLoader: GET / POST, responseType, timeout, abort   |
| **Benchmark**   | Shared Kurot/PixiJS/Egret comparison across 7 deterministic workloads |

Kurot and PixiJS run on WebGL 1 and WebGL 2. The bundled Egret 5.4.1 baseline
supports WebGL 1 only; unsupported combinations are omitted rather than
reported as zero-cost results.

The benchmark has three task-oriented commands:

```bash
pnpm benchmark
pnpm benchmark:smoke
pnpm benchmark:compare
```

`benchmark` starts the visible interactive page, `benchmark:smoke` quickly
checks that every supported engine/backend integration works, and
`benchmark:compare` runs the complete reproducible comparison matrix. Automated
runs print case-by-case progress and write reports to the ignored local
`examples/benchmark/results/` directory. Each run records its commit, exact
browser version, machine characteristics, raw samples, and a commit-addressed
history entry. Chromium also reports JS heap use; all adapters report logical
benchmark texture count, while Kurot additionally reports its retained blur
framebuffer pool.

Release regression gates are deliberately machine-scoped. Set a stable
`BENCHMARK_MACHINE` name on a reference machine and approve the generated
`results/baseline-candidate.json` as
`examples/benchmark/baselines/<machine-name>.json`. A later
`benchmark:compare` automatically applies the baseline only when the machine
name and exact browser version match. Timing limits use both observed variance
and a 12% floor; a baseline row needs at least five samples before it can gate.

Visual regression is a local, on-demand check for renderer changes. The tests
cover Canvas 2D, WebGL 1, WebGL 2, and WebGL context restoration:

```bash
pnpm test:visual
```

After an intentional renderer change has been visually reviewed, regenerate the
golden images with `pnpm test:visual:update`. Failed comparisons retain expected,
actual, and diff images under the ignored local `test-results/` directory.

The golden scene explicitly uses middle-aligned text, matching Core 2.5.3.
It loads its bundled Chakra Petch bold font before layout, so glyph-block
placement does not depend on a system Arial substitute. The font and its SIL
Open Font License are in `examples/visual-regression/fonts/`. Text-alignment
tests separately check the default and explicit top/middle/bottom modes.
Baselines live in `examples/visual-regression/tests/snapshots/<platform>/`
because font rasterization and ink metrics can differ between operating systems
even with the same font file. `pnpm test:visual:update` updates only the current
platform's baselines. Review text-layout changes before updating snapshots and
keep the existing pixel thresholds.

Resource-lifetime soak tests repeatedly rebuild scenes, upload and dispose
textures, pressure blur framebuffer pools, force garbage collection, and restore
a lost WebGL context. The short release smoke is:

```bash
pnpm test:soak
```

Long evidence runs use the explicit `test:soak:30m`, `test:soak:2h`, and
`test:soak:overnight` commands. Reports are written under the ignored
`examples/benchmark/results/soak/` directory. Virtual-list renderer reuse is
owned by the UI package and is intentionally outside this core test suite.

The example index also links to a release device-matrix page. It captures
browser/display details, the reported GPU renderer, WebGL limits, completed
manual checks, and known exceptions as a portable JSON record. This supports
manual macOS, Windows, iOS, Android, integrated-GPU, and discrete-GPU release
coverage without treating one machine's result as evidence for another.
`pnpm test:device-matrix` smoke-tests the diagnostics and JSON export path; it
does not replace the manual checks on physical devices.

## License

MIT

## Resource manifests

Sheet subkeys are metadata objects. Image/frame grids use logical coordinates;
see the [resource format contract](../ui-document/docs/resource-nine-slice.md)
for validation, defaults and authoring rules.

## Bitmap fonts

[Core bitmap fonts](docs/bitmap-fonts.md) use the headless @kurot/bitmap-font
package for data and layout. Built-in `font` resources load the descriptor and
its image page; `BitmapText` draws cropped glyphs through WebGL batching or
Canvas using the same layout. Descriptor data is immutable, text borrows its
font, and direct construction owns the page unless `ownsTexture: false` is set.

Widths/heights are layout constraints; use scaleX/scaleY to resize the artwork.
Height admits complete lines, and explicit `multiline = false` keeps the first
hard-separated line unwrapped. `BitmapText.EMPTY_FACTOR` is deprecated in favor
of `font.data.spaceAdvance`. See the linked contracts before migrating custom
bitmap-text measurements.
UI BitmapLabel, document font references and CLI/runtime font adapters use
this contract; project resource ownership remains explicit.
