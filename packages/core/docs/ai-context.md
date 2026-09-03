# @kurot/core — AI context map

Read this before exploring `src/`. It is a compressed map of the package so an
agent unfamiliar with Kurot does not need to re-derive the architecture from
scratch on every session. Treat the package source and its `src/index.ts`
barrel as the authority for current behavior and exports.

Package identity: `@kurot/core@1.0.19`. It provides Kurot's scene graph,
events, rendering, text, resource, network and media runtime. Rendering uses a
flat `InstructionSet + RenderPipe` pipeline. ES2022 / evergreen browsers only
with `strict: true`. Two
rendering backends: WebGL (primary, two-phase build/execute, InstructionSet-
driven) and Canvas 2D (fallback, direct scene-graph traversal every frame — no
InstructionSet, no dirty-flag optimization).

Source root: `src/kurot/`. Public API: `src/index.ts` re-exports each
subfolder's `index.ts` — see §4 for the full grouped list before assuming
something isn't exported.

## 1. Directory map

```
src/kurot/
├── display/       Scene graph: DisplayObject → DisplayObjectContainer → Sprite/Stage,
│                   Bitmap, Shape, Mesh, Graphics (flat GraphicsCommand[], not a node tree),
│                   texture/ (BitmapData, Texture, RenderTexture, SpriteSheet).
│                   Defines the retained tree the renderer reads from; does not render itself.
├── player/         Game loop + both render backends. Player, createPlayer(), SystemTicker/
│                   ticker singleton, ScreenAdapter, TouchHandler. Backend-neutral abstractions
│                   live here: RenderPipe / RenderContext / RenderBuffer interfaces (the latter
│                   two are internal), InstructionSet, and pipes/ (Bitmap/Graphics/Mesh/Text/
│                   Filter/Mask/Particle). The WebGL instruction renderer consumes the pipes.
│   ├── webgl/      WebGLRenderer, WebGLRenderContext, WebGLRenderBuffer/Target,
│   │               WebGLVertexArrayObject, WebGLDrawCmdManager, MultiTextureBatcher,
│   │               shaders/ (ShaderLib GLSL 1.00, ShaderLib2 GLSL 3.00). The WebGL-only execute path.
│   └── canvas/     CanvasRenderer (fallback AND a dependency of the WebGL path — see §2),
│                   DisplayList (offscreen cache backing cacheAsBitmap), CanvasBuffer.
├── events/         Event, EventDispatcher (capture/bubble, once()), EventPhase,
│                   8 concrete subclasses (TouchEvent, TimerEvent, ProgressEvent, etc.).
├── geom/           Matrix, Point, Rectangle + shared*/create()/release() object pools.
├── filters/        Filter base + BlurFilter, GlowFilter, DropShadowFilter, ColorMatrixFilter,
│                   CustomFilter. Pure data/padding — execution lives in player/pipes/.
├── text/           TextField, BitmapText/BitmapFont, StageText (DOM overlay, INPUT mode only),
│                   HtmlTextParser, InputController, TextMeasurer, WordWrap.
├── resource/        Resource class + `resource` singleton, ResourceLoader, analyzers/
│                   (Image/Json/Text/Sound/Sheet). Async, resource.json-driven (RES-compatible).
├── net/            HttpRequest, ImageLoader. Low-level; resource/analyzers build on these.
├── media/          Sound (+SoundChannel), Video. Web Audio + HTMLAudioElement fallback.
├── system/         Capabilities (static). Must be _init()'d — createPlayer() does this for you.
├── utils/          ByteArray, Timer, Logger, FontManager, DebugLog, Base64Util, NumberUtils.
│                   No engine-wide numeric object identity API is provided.
├── localStorage/   Plain functions (getItem/setItem/removeItem/clear), exported as a namespace.
└── external/       ExternalInterface — bridge to window.* host callbacks.
```

The dev-only benchmark page, runtime, adapters, vendor baseline, and tests are
colocated under `examples/benchmark/`; none are exported from `index.ts`.

## 2. Non-obvious current behavior

- `DisplayObject.matrix` getter returns a **clone**, not a live reference.
  Mutating the returned matrix does nothing — assign it back or use `$setMatrix`.
- `getChildAt`/`removeChildAt` return `undefined` on out-of-bounds instead of
  throwing. `removeChildren()` returns `void`, not the removed array.
- `blendMode` string values are Canvas 2D composite-operation names;
  the normal value is `"source-over"`.
- `cacheAsBitmap` is a pure alias for `cacheAsTexture(true)` — there is no
  separate legacy path. It **always** rasterizes to an offscreen Canvas 2D
  surface first (`DisplayList`), then optionally re-uploads as a GL texture.
  It never means "cache directly to a GPU framebuffer."
- `DisplayObjectContainer.isRenderGroup` has **zero visual effect on Canvas 2D
  rendering**. It's a WebGL-only optimization hint that isolates a subtree
  into its own `InstructionSet` — toggling it never changes pixels, only which
  instruction set absorbs rebuilds.
- `CanvasRenderer` is not purely a fallback. The WebGL backend depends on it
  internally to rasterize Graphics/Text to offscreen canvases before texture
  upload, and to snapshot `RenderTexture`. Don't reason about it as dead code
  when WebGL is active.
- The engine is **single-Player by design**. `Player`'s constructor wires
  static hook fields directly onto `DisplayObject`/`DisplayObjectContainer`
  (`$onStructureChange`, etc.) — there is no listener registry. A second
  `Player` instance clobbers the first one's hooks.
- The `WebGLRenderBuffer.release(WebGLRenderBuffer.create(...))` line at the
  end of `WebGLRenderer.render()` looks like dead code but isn't — it resets
  the GL viewport/projection after an in-frame offscreen activation (filter,
  mask, cacheAsBitmap). It's marked "DO NOT delete" in the source for a reason.
- `RenderPipe.destroyRenderable()` (immediate GPU resource release) is **not**
  called automatically on removal from stage, because `$onRemoveFromStage`
  also fires for temporary removals (e.g. virtualized lists). `GraphicsPipe`
  and `TextPipe` instead rely on a `FinalizationRegistry` to `gl.deleteTexture()`
  when the JS object is actually garbage-collected.
- `Resource` deliberately does **not** extend `EventDispatcher` — it has its
  own `on`/`off`/`onProgress` API. Don't assume every "event-ish" class in
  this codebase shares one dispatch shape.
- `resource.onProgress(cb)` listeners are permanent (never auto-removed); use
  `loadGroup()`'s own `onProgress` param for one-off tracking. Concurrent
  `loadGroup()` calls serialize through one internal `ResourceLoader`, they do
  not run in parallel.
- `Base64Util.encode()` takes an `ArrayBuffer`, not a `string`
  (`encode(new TextEncoder().encode(str))`).
- `Capabilities` must be initialized (`Capabilities._init()`) before use.
  `createPlayer()` does this automatically; constructing `Player` directly
  bypasses it and leaves capability queries stale.
- `StageText` (a real DOM `<input>` overlaid on the canvas) is only used for
  `TextFieldType.INPUT` — the rest of `TextField` is fully canvas/GPU-drawn.
- Four built-in effect filters are provided: `BlurFilter`, `GlowFilter`,
  `DropShadowFilter`, and `ColorMatrixFilter`. Custom effects use
  `CustomFilter` with raw GLSL.
- `Video` extends `Bitmap` and is directly renderable. It swaps between poster
  and video textures, invalidates `BitmapData` on each available video frame,
  and uses `requestAnimationFrame` only when `requestVideoFrameCallback` is
  unavailable.
- hitTest / lookup APIs return `undefined`, never `null`, throughout — check
  `=== undefined`.

## 3. Domain-specific terminology

| Term                                     | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Where defined                                                                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `InstructionSet`                         | Flat, reusable array of `Instruction` objects representing one frame's draw ops for a subtree, replacing scene-graph traversal at execute time. Tracks `structureDirty`, `dirtyRenderables`, and a `renderableIndex: Map<DisplayObject, number\|number[]>` for O(1) lookup during incremental patches.                                                                                                                                                                                 | `player/InstructionSet.ts`                                                                                                                                                           |
| `RenderPipe`                             | Interface implemented once per display-object category (`BitmapPipe`, `GraphicsPipe`, `MeshPipe`, `TextPipe`, `FilterPipe`, `MaskPipe`, `ParticlePipe`). It defines `addToInstructionSet()` (build), `updateRenderable()` (patch), and optional `destroyRenderable()` cleanup. The current renderer does not invoke cleanup merely because an object leaves the stage. Instructions are dispatched by `renderPipeId`.                                                               | `player/RenderPipe.ts`, implementations in `player/pipes/`                                                                                                                           |
| `structureDirty` vs `renderDirty`        | `structureDirty` (on `InstructionSet`): topology changed (child added/removed/reordered, filter/mask changed) → full rebuild. `renderDirty` (on `DisplayObject`, propagated via `$renderDirtyUp()`): only visual data changed (position/alpha/tint/texture) on an object whose instruction-list slot is still valid → patch only, no rebuild.                                                                                                                                          | Propagated in `display/DisplayObject.ts` (`$markDirty()`, `$cacheDirtyUp()`, `$renderDirtyUp()`); consumed in `player/webgl/WebGLRenderer.ts` `render()`                             |
| `RenderGroup`                            | A `DisplayObjectContainer` with `isRenderGroup = true`. Gets its own independent `InstructionSet` (tracked via `WeakMap`/`WeakRef` in `WebGLRenderer`). Structural changes inside the group never force the parent to rebuild — the parent set holds a single `renderGroup` instruction pointing at the child set.                                                                                                                                                                     | `isRenderGroup` field: `display/DisplayObjectContainer.ts`; group handling: `player/webgl/WebGLRenderer.ts` (`_buildRenderGroup()`, `markStructureDirty()`, `markRenderableDirty()`) |
| `cacheAsTexture` vs `cacheAsBitmap`      | `cacheAsBitmap` is a pure alias for `cacheAsTexture(true/false)`. `cacheAsTexture(options)` accepts `{resolution?, scaleMode?}` and creates a `DisplayList` (offscreen Canvas 2D buffer), reused across frames until dirty. On WebGL it's drawn as a single `displayListCache` instruction; rasterization still goes through `CanvasRenderer`, then the result is uploaded as a GL texture.                                                                                            | `display/DisplayObject.ts`; `player/canvas/DisplayList.ts`; `player/webgl/WebGLRenderer.ts` (`_executeDisplayListCache()`)                                                           |
| `DrawCmdManager` (`WebGLDrawCmdManager`) | Queue of `DrawCmd` records (12 types: TEXTURE, RECT, PUSH*MASK, POP_MASK, BLEND, RESIZE_TARGET, CLEAR_COLOR, ACT_BUFFER, ENABLE_SCISSOR, DISABLE_SCISSOR, SMOOTHING, MULTI_TEXTURE) sitting between `RenderPipe`s and actual GL calls. Auto-merges consecutive compatible commands. `WebGLRenderContext._flush()` walks it once per frame. This is the real batching layer — distinct from `MultiTextureBatcher`, which only assigns texture \_slots* for the `MULTI_TEXTURE` command. | `player/webgl/WebGLDrawCmdManager.ts`                                                                                                                                                |
| `WebGLRenderContext` lifecycle           | Constructed directly by `Player` (no factory/singleton). Auto-selects `webgl2` (ShaderLib2, GLSL ES 3.00) falling back to `webgl` (ShaderLib, GLSL ES 1.00). Listens for `webglcontextlost`/`webglcontextrestored`; on restore, re-creates GPU buffers, clears the shader cache, invalidates tracked `BitmapData.webGLTexture` refs, and tells `WebGLRenderer` to force a full instruction rebuild.                                                                                    | `player/webgl/WebGLRenderContext.ts`                                                                                                                                                 |
| `Player` vs `Stage`                      | `Stage` is a `DisplayObjectContainer` subclass: root of the scene graph, holds `stageWidth`/`stageHeight`/`scaleMode`/`orientation`/`frameRate` (proxies to the global `ticker`). No rendering logic itself. `Player` owns the `<canvas>`, constructs the WebGL-or-Canvas2D renderer, registers with `ticker` on `start()`, and calls `renderer.render(stage, buffer, matrix)` every tick. One `Player` per app — see §2.                                                              | `display/Stage.ts`, `player/Player.ts`                                                                                                                                               |
| Logical size vs render resolution        | `ScreenAdapter` keeps Stage and touch coordinates in logical units while sizing the Canvas backing store independently from its CSS size. `KurotOptions.resolution` defaults to `min(devicePixelRatio, 2)` and `ScreenAdapter.resolution` can change it at runtime. `Player` supplies the logical-to-physical root matrix; text, automatic display-list caches, and effect buffers inherit the resulting renderer resolution unless explicitly overridden.                                                                                                                           | `player/ScreenAdapter.ts`, `player/Player.ts`, `player/pipes/TextPipe.ts`, `player/canvas/DisplayList.ts`                                                                            |
| GPU texture GC                           | `GraphicsPipe`/`TextPipe` register cached textures through `RenderContext.registerTextureForGC()`. The WebGL context owns the module-level `FinalizationRegistry`; explicit destruction unregisters the token and deletes the texture immediately.                                                                                                                                                                                                                                    | `player/RenderContext.ts`, `player/pipes/GraphicsPipe.ts`, `player/pipes/TextPipe.ts`, `player/webgl/WebGLRenderContext.ts`                                                          |

## 4. Public API surface (`src/index.ts`)

Re-export order: `events`, `geom`, `utils`, `display`, `net`, `filters`,
`media`, `player`, `text`, `system`, then `localStorage` (namespaced),
`ExternalInterface` (named), `resource`.

- **Events**: `Event`, `EventMap` (type), `EventPhase`, `IEventDispatcher`, `EventDispatcher`, `FocusEvent`, `HTTPStatusEvent`, `IOErrorEvent`, `ProgressEvent`, `StageOrientationEvent`, `TextEvent`, `TimerEvent`, `TouchEvent`.
- **Geom**: `Point`/`sharedPoint`, `Rectangle`/`sharedRectangle`, `Matrix`/`sharedMatrix`.
- **Utils**: `NumberUtils`, `Base64Util`, `toColorString`, `Logger`/`LogLevel`, `Timer`/`TimerEvents`, `ByteArray`/`Endian`, `registerFontMapping`/`cacheFontResource`, `DebugLog`.
- **Display**: enums (`BitmapFillMode`, `BlendMode`/`blendModeToNumber`/`numberToBlendMode`, `CapsStyle`, `GradientType`, `JointStyle`, `OrientationMode`, `StageScaleMode`); `DisplayObject`/`RenderMode`/`RenderObjectType`/`DisplayObjectEvents`/`CacheAsTextureOptions`; `DisplayObjectContainer`, `Stage`, `Graphics`/`setGraphicsHitTest`, `Shape`, `Sprite`, `Bitmap`/`setBitmapPixelHitTest`, `Mesh`; textures: `BitmapData`/`CompressedTextureData`, `Texture`/`textureScaleFactor`, `RenderTexture`, `SpriteSheet`; `PathCommandType`/`GraphicsCommand` (type).
- **Net**: `HttpMethod`/`HttpMethodType`, `HttpResponseType`/`HttpResponseTypeType`, `HttpRequest`/`HttpRequestEvents`, `ImageLoader`/`ImageLoaderEvents`.
- **Filters**: `Filter`, `BlurFilter`, `ColorMatrixFilter`, `GlowFilter`, `DropShadowFilter`, `CustomFilter`.
- **Media**: `Sound`/`SoundType`/`SoundEvents`, `SoundChannel`, `Video`.
- **Player**: `Player`, `createPlayer`/`KurotApp`/`KurotOptions`; ticker: `SystemTicker`, `ticker`, `getTimer`, `setupLifecycle`, `START_TIME`, `invalidateRenderFlag`/`setInvalidateRenderFlag`, `requestRenderingFlag`/`setRequestRenderingFlag`, `Renderable`; rendering: `InstructionSet`/`Instruction`, `RenderPipe` (type), `CanvasBuffer`, `hitTestBuffer`, `CanvasRenderer`, `DisplayList`; input/layout: `TouchHandler`, `ScreenAdapter`/`StageDisplaySize`; WebGL: `WebGLRenderer`, `WebGLRenderContext`, `WebGLRenderBuffer`, `WebGLRenderTarget`, `WebGLVertexArrayObject`, `WebGLDrawCmdManager`, `WebGLProgram`, `ShaderLib`, `checkWebGLSupport`, `MultiTextureBatcher`.
  - `RenderContext` / `RenderBuffer` (`player/RenderContext.ts`, `player/RenderBuffer.ts`) are internal backend-neutral contracts and are not re-exported.
- **Text**: `HorizontalAlign`, `VerticalAlign`, `TextFieldType`, `TextFieldInputType`; types `ITextStyle`, `ITextElement`, `IWTextElement`, `ILineElement`, `IHitTextElement`; `HtmlTextParser`, `BitmapFont`, `BitmapText`, `measureText`/`getFontString`, `TextField`, `StageText`, `InputController`, `tokenize`/`splitGraphemes`.
- **System**: `Capabilities`.
- **localStorage**: namespace object — `import { localStorage } from '@kurot/core'`, then `localStorage.getItem(...)`.
- **External**: `ExternalInterface` (named, not namespaced).
- **Resource**: `Resource`/`resource` (shared instance), `ProgressCallback`, `ResourceEventListener`, `ResourceItem`, `ResourceType`, `ResourceConfig`/`ResourceConfigData`/`ResourceConfigEntry`, `ResourceLoader`, `ResourceEventType`/`ResourceEvent`, `AnalyzerBase`, `ImageAnalyzer`, `JsonAnalyzer`, `TextAnalyzer`, `SoundAnalyzer`, `SheetAnalyzer`.

`examples/benchmark/` is dev-only tooling and is **not** exported from `index.ts`.

## 5. Current API constraints

- Object identity uses object references; there is no `hashCode` API.
- Import the resource singleton as `resource`; `Resource` can also be
  instantiated directly.
- One `Player` owns the runtime hooks for a page. Constructing another player
  replaces those static hooks.
- `Player` constructs its own `WebGLRenderContext`; there is no context
  singleton.
- `$`-prefixed members are engine internals even when TypeScript visibility
  permits package-level access.
- `Base64Util.encode()` accepts `ArrayBuffer`.
- Pixel reads are provided by `RenderTexture.getPixel32()`; the corresponding
  base `Texture` read/export methods throw unsupported-operation errors.
- Hit-test and lookup misses return `undefined`.
- The supported runtime target is the browser; there is no native-wrapper
  backend.
- Event sources can specialize `EventDispatcher<EventMap>` for typed listener
  callbacks; untyped callers use the base `Event` overload.
- `MultiTextureBatcher.MAX_TEXTURES` is currently fixed at 8.

## 6. Task → file map

| I want to...                               | Look at                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Add a new DisplayObject subclass           | `display/DisplayObject.ts`, model it on `display/Shape.ts`                                                       |
| Add a new filter                           | `filters/`, follow `BlurFilter.ts`'s ping-pong dual-pass pattern; execution side in `player/pipes/FilterPipe.ts` |
| Change how instructions are built/executed | `player/webgl/WebGLRenderer.ts`, `player/InstructionSet.ts`                                                      |
| Add a new resource type/parser             | `resource/analyzers/`, register in `Resource.ts`                                                                 |
| Debug a texture-batching issue             | `player/webgl/MultiTextureBatcher.ts`, `player/webgl/WebGLDrawCmdManager.ts`                                     |
| Change text layout/wrapping                | `text/WordWrap.ts`, `text/TextMeasurer.ts`                                                                       |
| Understand dirty-flag propagation          | `display/DisplayObject.ts` (`$markDirty`, `$cacheDirtyUp`, `$renderDirtyUp`)                                     |
| Run perf tests                             | `examples/benchmark/`, `pnpm benchmark`; automated Kurot/PixiJS/Egret comparison via `pnpm benchmark:compare`  |
