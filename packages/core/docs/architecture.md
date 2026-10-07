# @kurot/core architecture

> Package version: 2.2.1. See [CHANGELOG.md](../CHANGELOG.md) for release notes.
> The [AI context map](./ai-context.md) covers directories, non-obvious behavior,
> terminology and task-to-file references. This document explains design choices
> and internal mechanisms for contributors; the two documents complement each other.

---

## 1. Overview

`@kurot/core` provides Kurot's display objects, rendering, events, geometry, text,
resources, networking and media runtime. Public APIs follow Egret's
`DisplayObject` and event model, while rendering uses a flat
`InstructionSet + RenderPipe` pipeline inspired by Pixi.js 8.

Since 2.2.0, Core uses published `@kurot/bitmap-font ^0.1.0` as the headless font-data
and layout kernel. Core manages font resources, image-page ownership and glyph
drawing in both backends. UI components belong to the UI package.

TextField uses Unicode 17.0 line-break rules with dictionary and overflow
tailoring. Since 2.2.1, tailoring uses imported rule identities, and layout
filters optional break positions through `Intl.Segmenter` grapheme boundaries.
Word and grapheme segmenters are cached; paragraph results remain local to
each layout. See [text layout](text-layout.md).

| Aspect             | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| Modules            | ES modules (`@kurot/core` npm package)                     |
| Types              | Strict TypeScript (`strict: true`)                         |
| Target             | ES2022 and modern browsers                                 |
| Rendering          | InstructionSet pipeline inspired by Pixi.js 8              |
| Batching           | Multiple textures, up to 8 per batch                       |
| Package management | Independent pnpm package                                   |
| Resources          | Loading, caching and lifecycle management through Resource |
| WebGL              | WebGL 1 and WebGL 2, selected at runtime                   |

See [Egret migration](../../../docs/egret-migration.md) for differences,
breaking changes and migration guidance.

---

## 2. Module structure

```
packages/core/src/kurot/
├── display/                         # scene graph
│   ├── DisplayObject.ts             # base class, dirty flags, render mode/type and cached bounds
│   ├── DisplayObjectContainer.ts    # containers, render groups and zIndex sorting
│   ├── Bitmap.ts                    # bitmap display with scale9Grid
│   ├── Sprite.ts                    # container with Graphics
│   ├── Shape.ts                     # vector shapes
│   ├── Mesh.ts                      # vertices, indices and UVs
│   ├── Stage.ts                     # scene root
│   ├── Graphics.ts                  # vector drawing commands
│   ├── GraphicsPath.ts              # PathCommandType and GraphicsCommand
│   ├── enums/                       # BlendMode, BitmapFillMode, CapsStyle, GradientType, JointStyle, OrientationMode, StageScaleMode
│   └── texture/                     # BitmapData, Texture, SpriteSheet, RenderTexture
├── player/                          # rendering pipeline and game loop
│   ├── Player.ts                    # Stage/renderer integration and performance metrics
│   ├── SystemTicker.ts              # RAF loop, ENTER_FRAME and callLater queue
│   ├── RenderPipe.ts                # RenderPipe interface
│   ├── InstructionSet.ts            # instruction list, renderableIndex and incremental dirty updates
│   ├── TouchHandler.ts              # touch and mouse input
│   ├── ScreenAdapter.ts             # screen adaptation with 7 scale modes
│   ├── createPlayer.ts              # initialization and RenderTexture renderer setup
│   ├── KurotOptions.ts              # player options
│   ├── pipes/                       # RenderPipe implementations
│   │   ├── BitmapPipe.ts            # bitmap instructions
│   │   ├── BitmapTextPipe.ts        # native bitmap-font glyph instructions
│   │   ├── GraphicsPipe.ts          # Canvas rasterization and texture upload
│   │   ├── MeshPipe.ts              # mesh instructions
│   │   ├── FilterPipe.ts            # pooled filter push/pop instructions
│   │   ├── MaskPipe.ts              # pooled mask push/pop instructions
│   │   ├── TextPipe.ts              # offscreen text rasterization and texture upload
│   │   └── ParticlePipe.ts          # particle rendering
│   ├── canvas/                      # Canvas 2D backend and offscreen capture
│   │   ├── CanvasRenderer.ts        # direct traversal with built-in filter approximations
│   │   ├── DisplayList.ts           # offscreen cache for cacheAsBitmap
│   │   └── CanvasBuffer.ts          # Canvas buffers and pixel hit testing
│   └── webgl/                       # primary WebGL backend
│       ├── WebGLRenderer.ts         # build/execute phases and render groups
│       ├── WebGLRenderContext.ts    # WebGL state, draw scheduling and filter execution
│       ├── WebGLRenderBuffer.ts     # pooled offscreen, stencil and scissor buffers
│       ├── WebGLRenderTarget.ts     # framebuffer management
│       ├── WebGLVertexArrayObject.ts # single-texture 20B and multi-texture 24B vertex layouts
│       ├── WebGLDrawCmdManager.ts   # 12 draw command types, including MULTI_TEXTURE
│       ├── WebGLProgram.ts          # shader program cache
│       ├── WebGLUtils.ts            # shader compilation, program creation, tint and texture helpers
│       ├── MultiTextureBatcher.ts   # 8-texture batches and slotMap assignments
│       └── shaders/                 # GLSL sources
│           ├── ShaderLib.ts         # GLSL ES 1.00 for WebGL 1
│           └── ShaderLib2.ts        # GLSL ES 3.00 for WebGL 2
├── events/                          # event classes, EventPhase and IEventDispatcher
├── geom/                            # Matrix, Point, Rectangle
├── filters/                         # Blur, Glow, DropShadow, ColorMatrix, CustomFilter, MultiPassFilter, BloomFilter
├── text/                            # text data and layout
│   ├── TextField.ts                 # rich text, input mode and password display
│   ├── BitmapText.ts                # bitmap text
│   ├── BitmapFont.ts                # bitmap font and texture ownership
│   ├── StageText.ts                 # DOM input for INPUT mode
│   ├── HtmlTextParser.ts            # HTML text parsing
│   ├── InputController.ts           # selection, caret and keyboard input
│   ├── TextMeasurer.ts              # measureText and getFontString
│   ├── TextSegmentation.ts          # shared cached word/grapheme segmenters and UTF-16 boundaries
│   ├── LineBreaks.ts                # Unicode 17.0 UAX #14 boundaries and dictionary segmentation
│   ├── TextLineLayout.ts            # rich-text wrapping, width fitting and UTF-16 source offsets
│   ├── WordWrap.ts                  # independent token and grapheme utilities
│   ├── enums/                      # HorizontalAlign, VerticalAlign, TextFieldType, TextFieldInputType
│   └── types/                      # ITextElement, IWTextElement, ILineElement, IHitTextElement
├── resource/                        # resource management
│   ├── Resource.ts                  # resource manager, shared instance and async/await API
│   ├── ResourceConfig.ts            # resource configuration
│   ├── ResourceEvent.ts             # resource events
│   ├── ResourceItem.ts              # resource items
│   ├── ResourceLoader.ts            # resource loading queue
│   └── analyzers/                   # AnalyzerBase, Image, Json, Sheet, Sound, Text and Font analyzers
├── system/                          # environment capabilities
│   └── Capabilities.ts              # runtime capabilities using UA and Client Hints
├── net/                             # HttpRequest, ImageLoader, HttpMethod, HttpResponseType
├── media/                           # Sound, SoundChannel, Video
├── utils/                           # ByteArray, Timer, Logger, FontManager, DebugLog, Base64Util, NumberUtils, toColorString
│                                    # object identity uses === or WeakMap; no HashObject
├── localStorage/                    # local storage functions
└── external/                        # ExternalInterface
```

---

## 3. Rendering pipeline

### 3.1 Build and execute phases

```
Phase A — Build (structureDirty):
  Traverse the display tree → create Instructions with transform snapshots → InstructionSet

Phase A' — Update (renderDirty):
  Visit dirtyRenderables → refresh transform snapshots using renderableIndex lookups

Phase B — Execute (every frame):
  Dispatch instructions to pipes without traversing the scene graph
```

### 3.2 RenderPipe

```
RenderPipe<T extends DisplayObject>
├── addToInstructionSet(renderable, set) — build instructions after structure changes
├── updateRenderable(renderable)        — update visual data
└── destroyRenderable(renderable)       — optional immediate cleanup; see texture GC below

Implementations:
├── BitmapPipe     → BitmapInstruction     → drawImage(), including scale9Grid
├── BitmapTextPipe → BitmapTextInstruction → shared layout → batched glyph drawImage()
├── GraphicsPipe   → GraphicsInstruction   → Canvas rasterization → texture upload → drawTexture()
├── MeshPipe       → MeshInstruction       → drawMesh()
├── TextPipe       → TextInstruction       → offscreen Canvas → texture upload → drawImage()
├── ParticlePipe   → ParticleInstruction   → particle batches
├── FilterPipe     → FilterPush/Pop        → offscreen FBO → shader effects
└── MaskPipe       → MaskPush/Pop          → stencil, scissor or offscreen compositing
```

**GPU texture cleanup.** `WebGLRenderer` does not automatically call
`destroyRenderable()`. Display objects have no permanent-destruction signal:
`$onRemoveFromStage` also fires when an object is temporarily removed and later
reused. Releasing textures at that point would force repeated rasterization and
uploads, for example when virtual lists reuse renderers.

GraphicsPipe and TextPipe use `FinalizationRegistry` to call `gl.deleteTexture()`
when their Graphics/TextField owners are garbage-collected. Explicit
`destroyRenderable()` remains an optional immediate-release path; it unregisters
the GC callback to avoid duplicate deletion. BitmapPipe and MeshPipe have no
pipe-owned texture cleanup because their textures belong to BitmapData.

### 3.3 Render groups

```typescript
backgroundLayer.isRenderGroup = true;
```

- Each render group owns an InstructionSet.
- Its parent set contains one `renderGroup` instruction referencing that subtree.
- Structure changes inside the group rebuild its own set, not its parent's set.
- Static subtrees do not need to be traversed on every WebGL frame.
- A `WeakMap<DisplayObjectContainer, InstructionSet>` stores group sets.
- WeakRef tracks group lifetimes without preventing garbage collection.

### 3.4 Multi-texture batching

- MultiTextureBatcher manages up to 8 texture slots, the WebGL 1 minimum guarantee.
- The multi-texture vertex layout adds `aTextureId`, increasing the stride from
  20 to 24 bytes.
- The fragment shader selects textures with an if/else chain for WebGL 1 support.
- Mesh, filter and blend changes flush the current batch when needed.
- WebGLVertexArrayObject maintains single-texture and multi-texture buffers and
  grows GPU buffers as needed.

### 3.5 Dirty flags

```
DisplayObject flags:
├── cacheDirty  — invalidates cacheAsBitmap and propagates upward
├── renderDirty — visual changes (position, texture, alpha, tint), propagated upward
└── renderMode  — NONE, FILTER, CLIP or SCROLLRECT

Notifications (single-Player static hooks installed by Player):
├── $onStructureChange?: () => void                    — structure changes
├── $onRenderableDirty?: (obj: DisplayObject) => void  — visual changes
├── DisplayObjectContainer.$onContainerStructureChange?: (owner) => void
├── $markDirty()
│   ├── refresh worldAlpha/worldTint caches for constant-time reads
│   ├── $onRenderableDirty?.(this) → WebGLRenderer.markRenderableDirty()
│   └── propagate cacheDirty and renderDirty upward
├── $updateRenderMode()
│   └── $onStructureChange?.() → WebGLRenderer.markStructureDirty()
└── DisplayObjectContainer.markDirtyInternal()
    └── $onContainerStructureChange?.(this) → markStructureDirty(owner)
```

The engine supports one Player per page. Its constructor assigns these static
hooks to instance closures, and `destroy()` clears them. See `player/Player.ts`.

### 3.6 RenderObjectType dispatch

DisplayObject uses the `renderObjectType` enum to avoid `instanceof` checks on
hot rendering paths:

| Enum          | Value | Display type | Pipe           |
| ------------- | ----- | ------------ | -------------- |
| `NONE`        | 0     | No rendering | —              |
| `BITMAP`      | 1     | Bitmap       | BitmapPipe     |
| `MESH`        | 2     | Mesh         | MeshPipe       |
| `SHAPE`       | 3     | Shape        | GraphicsPipe   |
| `SPRITE`      | 4     | Sprite       | GraphicsPipe   |
| `TEXT`        | 5     | TextField    | TextPipe       |
| `PARTICLE`    | 6     | Particle     | ParticlePipe   |
| `BITMAP_TEXT` | 7     | BitmapText   | BitmapTextPipe |

---

## 4. WebGL backend

### 4.1 WebGL selection

WebGLRenderContext selects a backend during initialization:

- **WebGL 2 first:** `canvas.getContext('webgl2')` uses ShaderLib2 (GLSL ES 3.00).
- **WebGL 1 fallback:** `canvas.getContext('webgl')` uses ShaderLib (GLSL ES 1.00).
  No `experimental-webgl` alias is used; the target browsers support `webgl`.
- **No separate probe canvas:** Player tries WebGL 2 and WebGL 1 directly on the
  application's canvas, then falls back to Canvas 2D if both fail.
  `checkWebGLSupport()` remains available to callers but is not used by Player.
- Shader helpers are selected through context properties: `ctx.shaders`,
  `ctx.blurTierFn`, `ctx.makeBlurH` and `ctx.makeBlurV`.

### 4.2 Rendering flow

```
Player.render()
  → WebGLRenderer.render(stage, buffer, matrix)
    → Phase A: _buildInstructions() / _updateDirtyRenderables()
    → Phase B: _executeInstructions()
      → Pipe.execute() → WebGLRenderContext.drawImage/drawMesh/drawTexture()
    → WebGLRenderContext.flush() → _flush()
      → upload vertices with bufferSubData → visit DrawCmdManager → dispatch draw batches
```

### 4.3 Shaders

| Shader                             | Purpose                                 | Source    |
| ---------------------------------- | --------------------------------------- | --------- |
| default_vert + texture_frag        | Standard texture drawing                | ShaderLib |
| multi_vert + multi_frag            | Multi-texture batches, up to 8 textures | ShaderLib |
| default_vert + colorTransform_frag | ColorMatrixFilter                       | ShaderLib |
| default_vert + glow_frag           | Glow/DropShadow                         | ShaderLib |
| fullscreen_vert + makeBlurH/VFrag  | Horizontal/vertical blur in two passes  | ShaderLib |
| default_vert + primitive_frag      | Solid rectangles for stencil masks      | ShaderLib |
| fullscreen_vert                    | Fullscreen quad blits for filter passes | ShaderLib |

ShaderLib2 supplies equivalent GLSL ES 3.00 shaders for WebGL 2, using `in`/`out`
instead of `attribute`/`varying`, and `texture()` instead of `texture2D()`.
Blur shaders use fixed loop limits of 4, 8, 16 or 32 samples with triangular weights.

### 4.4 Filters

FilterPipe emits paired push/pop instructions:

- **Push:** allocate an offscreen FBO with filter padding and redirect drawing.
- **Pop:** call `compositeFilterResult()` to composite the result into the parent.

The compositing sequence is:

1. Flush pending drawing to complete the captured input.
2. WebGLFilterSystem executes filters in array order. Intermediate passes disable
   blending, stencil and scissor and write to separate targets.
3. Restore the parent FBO, viewport and clip state explicitly.
4. Composite with `drawFramebufferTexture()` without applying inherited alpha/tint
   a second time.
5. Flush and return intermediate textures to the pool. Failures release resources
   and queued commands so a later frame can recover.

- **ColorMatrixFilter:** an unmasked leaf with one filter and inherited resolution
  can use the inline path; groups and combinations use offscreen targets.
- **BlurFilter:** horizontal/vertical separation, with quality controlling pass
  pairs. Large radii downsample to stay within the 32-physical-pixel shader tier.
- **Glow/DropShadow:** retain glow_frag; knockout controls whether the source image
  remains in the output.
- **CustomFilter:** explicit GLSL 100/300 sources, reflected numeric uniforms and
  auxiliary BitmapData uploads with independent sampling.
- **MultiPassFilter/BloomFilter:** ordered acyclic pass graphs, with original or
  earlier inputs and per-pass scaling.

WebGLFilterTargetPool caches up to 16 idle targets or 64 MiB. Subtree captures and
auxiliary images are outside this limit. WebGLFilterTextures manages auxiliary
image uploads and restoration. Shader programs are cached by GL context and source.

Filter-chain padding accumulates and includes child effects without changing
layout bounds. Offscreen passes use framebuffer UVs, with (0,0) at the lower left,
and preserve orientation. DropShadow angles reach shaders in radians. Auxiliary
DOM image bindings use UV transforms to account for vertical orientation.

See [GPU filters](filters.md) for APIs, examples, Canvas support and cache limits.

### 4.5 Masks

- Axis-aligned scrollRect/maskRect without an outer scissor uses scissor clipping.
- Rotated rectangles or rectangles inside an outer scissor use stencil clipping.
  Both the WebGL canvas and capability checks request stencil without depth.
- DisplayObject masks use offscreen compositing with destination-in.

---

## 5. Canvas 2D backend

CanvasRenderer traverses the scene graph directly and supplies the fallback when
WebGL is unavailable. It also rasterizes offscreen caches and RenderTexture captures.

- Offscreen Graphics caching through `canvasCacheDirty`.
- CSS blur/drop-shadow approximations for Blur, DropShadow and Glow.
- CPU pixel processing for ColorMatrixFilter.
- DisplayList support for cacheAsBitmap.
- Pixel hit testing through a 3×3 offscreen buffer.
- Bitmap, Shape, Sprite, Mesh, TextField and BitmapText rendering.
- BitmapText draws atlas regions from shared layout, including trim offsets, tint
  and ordinary clipping. See [bitmap fonts](bitmap-fonts.md) for ownership.
- TextField measurement, line layout and fillText/strokeText drawing. See
  [text layout](./text-layout.md) for wrapping and source-offset contracts.

CustomFilter, MultiPassFilter and BloomFilter are GPU effects and are skipped.
Built-in Canvas approximations are not pixel-equivalent to WebGL. The same
boundary applies to cacheAsTexture and RenderTexture capture.

---

## 6. Application startup

### `createPlayer(options)`

```typescript
import { createPlayer, Event } from '@kurot/core';

const app = createPlayer({
	canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
	frameRate: 60,
	scaleMode: 'showAll',
	contentWidth: 640,
	contentHeight: 1136,
});

app.start(root);
```

`createPlayer` initializes:

1. Capabilities._init() for OS, isMobile and language detection.
2. RenderTexture.renderer on first use, providing offscreen Canvas 2D rendering.
3. Stage, Player, TouchHandler and ScreenAdapter, preferring WebGL with Canvas fallback.
4. setupLifecycle(stage) for ENTER_FRAME and RENDER broadcasts.

### KurotOptions

| Property        | Type                | Default                   | Description                 |
| --------------- | ------------------- | ------------------------- | --------------------------- |
| `canvas`        | `HTMLCanvasElement` | Required                  | Rendering canvas            |
| `frameRate`     | `number`            | `60`                      | Target frame rate           |
| `scaleMode`     | `StageScaleMode`    | `'showAll'`               | Screen scale mode           |
| `contentWidth`  | `number`            | `canvas.width` or `640`   | Logical content width       |
| `contentHeight` | `number`            | `canvas.height` or `1136` | Logical content height      |
| `resolution`    | `number`            | `min(DPR, 2)`             | Backing-store pixel density |
| `orientation`   | `OrientationMode`   | `'auto'`                  | Screen orientation          |
| `maxTouches`    | `number`            | `99`                      | Maximum touch points        |
| `background`    | `string`            | —                         | CSS background color        |

### KurotApp

| Property        | Type                             | Description                                            |
| --------------- | -------------------------------- | ------------------------------------------------------ |
| `player`        | `Player`                         | Renderer and game loop                                 |
| `stage`         | `Stage`                          | Scene root                                             |
| `touchHandler`  | `TouchHandler`                   | Touch and mouse input                                  |
| `screenAdapter` | `ScreenAdapter`                  | Screen adaptation                                      |
| `start(root?)`  | `(root?: DisplayObject) => void` | Start or resume the game loop                          |
| `stop()`        | `() => void`                     | Stop the loop; it can be resumed                       |
| `destroy()`     | `() => void`                     | Release the player, input, adapter and lifecycle hooks |

---

## 7. Test coverage

Tests are organized by module in `test/`. Run `pnpm --dir packages/core test` for
current file and test counts.

| Module                    | Main coverage                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| events/                   | Event, EventDispatcher, EventPropagation, EventMap, TouchEvent, HTTPStatusEvent, ProgressEvent                                                                                                           |
| geom/                     | Matrix, Point, Rectangle                                                                                                                                                                                 |
| utils/                    | ByteArray, Base64Util, Logger, DebugLog, NumberUtils, toColorString                                                                                                                                      |
| display/                  | DisplayObject, DisplayObjectContainer, DisplayObjectIntegration, Bitmap, BitmapData, Sprite, Shape, Mesh, Stage, StageText, Graphics, Texture, SpriteSheet, BlendMode, DisplayList                       |
| filters/                  | Filter classes, CustomFilter, filter integration and offscreen effect transforms                                                                                                                         |
| media/                    | Sound, SoundChannel, Video                                                                                                                                                                               |
| player/                   | InstructionSet, InstructionPool, RenderGroup, TextPipe, MaskPipe, WebGLRendererDirty, WebGLRendererLeaf, WebGLVertexArrayObject, WebGLRenderBuffer, WebGLBlurFramebufferPool, CreatePlayer, TouchHandler |
| net/                      | HttpRequest, ImageLoader                                                                                                                                                                                 |
| resource/                 | Resource group serialization; ResourceLoader concurrency, retries and missing analyzers; FontAnalyzer loading and ownership                                                                              |
| examples/benchmark/tests/ | Benchmark runtime and cross-engine comparisons                                                                                                                                                           |
| text/                     | Display integration, BitmapText layout and native glyph geometry                                                                                                                                         |
