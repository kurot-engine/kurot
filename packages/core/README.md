# @kurot/core

A modern rewrite of the Egret game engine. Maintains Egret-compatible display object and event APIs while upgrading the rendering architecture, type safety, and tooling.

> **Stable (1.0.12).** Targets ES2022 and evergreen browsers (Chrome / Edge / Firefox / Safari). No IE / old-Android / pre-2022 Safari support shims.

## Features

**Rendering Engine**

- WebGL-first with automatic Canvas 2D fallback when WebGL initialization fails
- WebGL-only InstructionSet pipeline (Build → Execute two-phase, inspired by Pixi.js 8)
- Multi-texture batching (up to 8 textures per draw call)
- RenderGroup layers — localize instruction rebuilds to the affected subtree
- Filters: Blur (ping-pong dual-pass), Glow, DropShadow, ColorMatrix, custom shaders
- Masks: automatic selection between scissor / stencil / offscreen compositing
- PixiJS-style `cacheAsTexture()` plus Egret-compatible `cacheAsBitmap`
- WebGL Context Lost recovery

**Display Objects**

- Full scene graph: DisplayObject → Container → Sprite → Stage
- Bitmap (with scale9Grid), Shape, Mesh, TextField, BitmapText, Video
- Graphics vector drawing (rect, circle, ellipse, arc, bezier, gradients, dashed lines)
- cacheAsBitmap / cacheAsTexture, tint, skew, zIndex sorting

**Event System**

- Egret-compatible event classes: Event, TouchEvent, TimerEvent, ProgressEvent, etc.
- Capture / bubble two-phase dispatch, object pooling, `once()` built-in
- Unified touch + mouse handling, multi-touch support

**Other**

- 7 screen scale modes (showAll / noScale / exactFit / noBorder, etc.)
- Resource manager — async/await loading, group-based batching, 5 built-in parsers (Image / Json / Text / Sound / Sheet)
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

**Migrating from Egret (1.0.0 breaking changes)**

- `.hashCode` and the `HashObject` base class were removed. Use `WeakMap`-keyed lookups or `===` for object identity instead of comparing integer hash codes. Internal consumers were migrated to `WeakMap` in 0.6.3.
- `Resource.instance` (singleton getter) was removed — import the shared `resource` instance directly: `import { resource } from '@kurot/core'`.
- The multi-Player listener registration API on `DisplayObject` / `DisplayObjectContainer` (`addStructureChangeListener` / `addRenderableDirtyListener` / `addContainerStructureChangeListener`) was removed — the engine is single-Player by design.
- `WebGLRenderContext.getInstance()` / `resetInstance()` were removed — `Player` constructs the context directly.
- Internal fields were renamed with a `$` prefix (e.g. `$x`, `$y`, `$renderDirty`) to separate engine state from public API.
- Vendor-prefixed fallbacks (`experimental-webgl`, `webkitAudioContext`, `webkit/moz fullscreen`) and the hand-rolled base64 implementation were removed in favour of native APIs.

**vs. Egret**

| Aspect      | Egret             | Kurot                 |
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

// stop() is resumable; destroy() performs final lifecycle cleanup.
// app.destroy();
```

## Development

```bash
pnpm install
pnpm run build        # compile
pnpm run test         # run tests (634 cases)
pnpm run dev          # watch mode
```

## Documentation

- [CHANGELOG.md](./CHANGELOG.md) — versioned release notes, including the full list of 1.0.0 breaking changes
- [Architecture](./docs/architecture.md) — engine structure and rendering pipeline
- [Resource system](./docs/resource.md) — resource configuration, loading, and lifecycle
- [PixiJS alignment](./docs/pixi-alignment.md) — rendering concepts adopted from PixiJS and intentional differences
- [Live demo](https://irwinmc.github.io/kurot-demo/) — interactive rendering examples

## Test Pages

Interactive test pages in `examples/` require an HTTP dev server (ES Modules don't work over `file://`):

```bash
pnpm benchmark
```

| Page            | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| **Visual Test** | 19 cases: Shape, Graphics, Filters, Mask, RenderGroup, Animation     |
| **Bitmap Test** | Bitmap rendering: scale, rotation, SpriteSheet, scale9Grid, batching |
| **Mesh Test**   | Mesh deformation: Quad / Fan / Grid presets, Wave / Ripple / Twist   |
| **Sound Test**  | Sound / SoundChannel: load, play, volume, loop, error handling       |
| **Video Test**  | Video: load, play/pause, seek, volume, resize                        |
| **Net Test**    | HttpRequest / ImageLoader: GET / POST, responseType, timeout, abort  |
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

Deterministic visual regression tests cover Canvas 2D, WebGL 1, WebGL 2, and
WebGL context restoration:

```bash
pnpm test:visual
```

After an intentional renderer change has been visually reviewed, regenerate the
golden images with `pnpm test:visual:update`. Failed comparisons retain expected,
actual, and diff images under the ignored local `test-results/` directory.

## License

MIT
