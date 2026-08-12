# @kurot/core — AI context map

Read this before exploring `src/`. It is a compressed map of the package so an
agent unfamiliar with Kurot does not need to re-derive the architecture from
scratch on every session. It complements, and does not replace,
[architecture.md](./architecture.md), [pixi-alignment.md](./pixi-alignment.md),
and [resource.md](./resource.md) — those go deeper on rendering internals and
the resource system.

Package identity: `@kurot/core@1.0.12`, TypeScript rewrite of the Egret engine
runtime. Keeps Egret's public `DisplayObject`/event API surface, replaces the
rendering internals with a Pixi.js‑8‑style flat "InstructionSet + RenderPipe"
pipeline. ES2022 / evergreen browsers only, `strict: true`, no `any`. Two
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
│                   ticker singleton, ScreenAdapter, TouchHandler, RenderPipe interface.
│   ├── webgl/      WebGLRenderer, WebGLRenderContext, WebGLRenderBuffer/Target,
│   │               WebGLVertexArrayObject, WebGLDrawCmdManager, MultiTextureBatcher,
│   │               InstructionSet, pipes/ (Bitmap/Graphics/Mesh/Text/Filter/Mask/Particle),
│   │               shaders/ (ShaderLib GLSL 1.00, ShaderLib2 GLSL 3.00).
│   └── canvas/     CanvasRenderer (fallback AND a dependency of the WebGL path — see §2),
│                   DisplayList (offscreen cache backing cacheAsBitmap), RenderBuffer.
├── events/         Event, EventDispatcher (capture/bubble, once()), EventPhase,
│                   8 concrete subclasses (TouchEvent, TimerEvent, ProgressEvent, etc.).
├── geom/           Matrix, Point, Rectangle + shared*/create()/release() object pools.
├── filters/        Filter base + BlurFilter, GlowFilter, DropShadowFilter, ColorMatrixFilter,
│                   CustomFilter. Pure data/padding — GPU execution lives in player/webgl/pipes/.
├── text/           TextField, BitmapText/BitmapFont, StageText (DOM overlay, INPUT mode only),
│                   HtmlTextParser, InputController, TextMeasurer, WordWrap.
├── resource/        Resource class + `resource` singleton, ResourceLoader, analyzers/
│                   (Image/Json/Text/Sound/Sheet). Async, resource.json-driven (RES-compatible).
├── net/            HttpRequest, ImageLoader. Low-level; resource/analyzers build on these.
├── media/          Sound (+SoundChannel), Video. Web Audio + HTMLAudioElement fallback.
├── system/         Capabilities (static). Must be _init()'d — createPlayer() does this for you.
├── utils/          ByteArray, Timer, Logger, FontManager, DebugLog, Base64Util, NumberUtils.
│                   (HashObject is GONE — do not reference it, see §5.)
├── localStorage/   Plain functions (getItem/setItem/removeItem/clear), exported as a namespace.
├── external/       ExternalInterface — bridge to window.* host callbacks.
└── benchmark/       Dev/QA stress-test harness. NOT exported from index.ts — internal only.
```

## 2. Non-obvious behavior (things an AI trained on Egret/Pixi/cocos will get wrong)

- `DisplayObject.matrix` getter returns a **clone**, not a live reference.
  Mutating the returned matrix does nothing — assign it back or use `$setMatrix`.
- `getChildAt`/`removeChildAt` return `undefined` on out-of-bounds instead of
  throwing. `removeChildren()` returns `void`, not the removed array.
- `blendMode` string values are Canvas-2D composite-operation names, not
  Egret's: `"normal"` is now `"source-over"`.
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
- `RenderPipe.destroyRelable()` (immediate GPU resource release) is **not**
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
- Only 4 built-in filters exist (not 20+ like Pixi.js). Extension is via
  `CustomFilter` with raw GLSL, not a larger built-in library.
- hitTest / lookup APIs return `undefined`, never `null`, throughout — check
  `=== undefined`.

## 3. Domain-specific terminology

| Term                                     | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Where defined                                                                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `InstructionSet`                         | Flat, reusable array of `Instruction` objects representing one frame's draw ops for a subtree, replacing scene-graph traversal at execute time. Tracks `structureDirty`, `dirtyRenderables`, and a `renderableIndex: Map<DisplayObject, number\|number[]>` for O(1) lookup during incremental patches.                                                                                                                                                                                 | `player/webgl/InstructionSet.ts`                                                                                                                                                     |
| `RenderPipe`                             | Interface implemented once per display-object category (`BitmapPipe`, `GraphicsPipe`, `MeshPipe`, `TextPipe`, `FilterPipe`, `MaskPipe`, `ParticlePipe`). Three lifecycle methods: `addToInstructionSet()` (build), `updateRenderable()` (patch), optional `destroyRenderable()` (rarely invoked, see §2). Dispatched via `renderPipeId` string per instruction.                                                                                                                        | `player/RenderPipe.ts`, impls in `player/webgl/pipes/`                                                                                                                               |
| `structureDirty` vs `renderDirty`        | `structureDirty` (on `InstructionSet`): topology changed (child added/removed/reordered, filter/mask changed) → full rebuild. `renderDirty` (on `DisplayObject`, propagated via `$renderDirtyUp()`): only visual data changed (position/alpha/tint/texture) on an object whose instruction-list slot is still valid → patch only, no rebuild.                                                                                                                                          | Propagated in `display/DisplayObject.ts` (`$markDirty()`, `$cacheDirtyUp()`, `$renderDirtyUp()`); consumed in `player/webgl/WebGLRenderer.ts` `render()`                             |
| `RenderGroup`                            | A `DisplayObjectContainer` with `isRenderGroup = true`. Gets its own independent `InstructionSet` (tracked via `WeakMap`/`WeakRef` in `WebGLRenderer`). Structural changes inside the group never force the parent to rebuild — the parent set holds a single `renderGroup` instruction pointing at the child set.                                                                                                                                                                     | `isRenderGroup` field: `display/DisplayObjectContainer.ts`; group handling: `player/webgl/WebGLRenderer.ts` (`_buildRenderGroup()`, `markStructureDirty()`, `markRenderableDirty()`) |
| `cacheAsTexture` vs `cacheAsBitmap`      | `cacheAsBitmap` is a pure alias for `cacheAsTexture(true/false)`. `cacheAsTexture(options)` accepts `{resolution?, scaleMode?}` and creates a `DisplayList` (offscreen Canvas 2D buffer), reused across frames until dirty. On WebGL it's drawn as a single `displayListCache` instruction; rasterization still goes through `CanvasRenderer`, then the result is uploaded as a GL texture.                                                                                            | `display/DisplayObject.ts` (getter/setter ~L317–344); `player/canvas/DisplayList.ts`; `player/webgl/WebGLRenderer.ts` `_executeDisplayListCache()`                                   |
| `DrawCmdManager` (`WebGLDrawCmdManager`) | Queue of `DrawCmd` records (12 types: TEXTURE, RECT, PUSH*MASK, POP_MASK, BLEND, RESIZE_TARGET, CLEAR_COLOR, ACT_BUFFER, ENABLE_SCISSOR, DISABLE_SCISSOR, SMOOTHING, MULTI_TEXTURE) sitting between `RenderPipe`s and actual GL calls. Auto-merges consecutive compatible commands. `WebGLRenderContext._flush()` walks it once per frame. This is the real batching layer — distinct from `MultiTextureBatcher`, which only assigns texture \_slots* for the `MULTI_TEXTURE` command. | `player/webgl/WebGLDrawCmdManager.ts`                                                                                                                                                |
| `WebGLRenderContext` lifecycle           | Constructed directly by `Player` (no factory/singleton). Auto-selects `webgl2` (ShaderLib2, GLSL ES 3.00) falling back to `webgl` (ShaderLib, GLSL ES 1.00). Listens for `webglcontextlost`/`webglcontextrestored`; on restore, re-creates GPU buffers, clears the shader cache, invalidates tracked `BitmapData.webGLTexture` refs, and tells `WebGLRenderer` to force a full instruction rebuild.                                                                                    | `player/webgl/WebGLRenderContext.ts`                                                                                                                                                 |
| `Player` vs `Stage`                      | `Stage` is a `DisplayObjectContainer` subclass: root of the scene graph, holds `stageWidth`/`stageHeight`/`scaleMode`/`orientation`/`frameRate` (proxies to the global `ticker`). No rendering logic itself. `Player` owns the `<canvas>`, constructs the WebGL-or-Canvas2D renderer, registers with `ticker` on `start()`, and calls `renderer.render(stage, buffer, matrix)` every tick. One `Player` per app — see §2.                                                              | `display/Stage.ts`, `player/Player.ts`                                                                                                                                               |
| GPU texture GC                           | `GraphicsPipe`/`TextPipe` each keep a module-level `FinalizationRegistry` that deletes the GL texture when the owning JS object is actually garbage-collected, because there is no reliable "permanently removed from stage" signal to hook `destroyRenderable()` to.                                                                                                                                                                                                                  | `player/webgl/pipes/GraphicsPipe.ts`, `TextPipe.ts`                                                                                                                                  |

## 4. Public API surface (`src/index.ts`)

Re-export order: `events`, `geom`, `utils`, `display`, `net`, `filters`,
`media`, `player`, `text`, `system`, then `localStorage` (namespaced),
`ExternalInterface` (named), `resource`.

- **Events**: `Event`, `EventMap` (type), `EventPhase`, `IEventDispatcher`, `EventDispatcher`, `FocusEvent`, `HTTPStatusEvent`, `IOErrorEvent`, `ProgressEvent`, `StageOrientationEvent`, `TextEvent`, `TimerEvent`, `TouchEvent`.
- **Geom**: `Point`/`sharedPoint`, `Rectangle`/`sharedRectangle`, `Matrix`/`sharedMatrix`.
- **Utils**: `NumberUtils`, `Base64Util`, `toColorString`, `Logger`/`LogLevel`, `Timer`/`TimerEvents`, `ByteArray`/`Endian`, `registerFontMapping`/`cacheFontResource`, `DebugLog`.
- **Display**: enums (`BitmapFillMode`, `BlendMode`+helpers, `CapsStyle`, `GradientType`, `JointStyle`, `OrientationMode`, `StageScaleMode`); `DisplayObject`/`RenderMode`/`RenderObjectType`; `DisplayObjectContainer`, `Stage`, `Graphics`, `Shape`, `Sprite`, `Bitmap`, `Mesh`; textures: `BitmapData`, `Texture`, `RenderTexture`, `SpriteSheet`; `PathCommandType`/`GraphicsCommand` (type).
- **Net**: `HttpMethod`, `HttpResponseType`, `HttpRequest`/`HttpRequestEvents`, `ImageLoader`/`ImageLoaderEvents`.
- **Filters**: `Filter`, `BlurFilter`, `ColorMatrixFilter`, `GlowFilter`, `DropShadowFilter`, `CustomFilter`.
- **Media**: `Sound`/`SoundType`/`SoundEvents`, `SoundChannel`, `Video`.
- **Player**: `Player`, `createPlayer`/`KurotApp`/`KurotOptions`; ticker: `SystemTicker`, `ticker`, `getTimer`, `setupLifecycle`; rendering: `InstructionSet`/`Instruction`, `RenderPipe`, `RenderBuffer`, `CanvasRenderer`, `DisplayList`; input/layout: `TouchHandler`, `ScreenAdapter`; WebGL: `WebGLRenderer`, `WebGLRenderContext`, `WebGLRenderBuffer`, `WebGLRenderTarget`, `WebGLVertexArrayObject`, `WebGLDrawCmdManager`, `WebGLProgram`, `ShaderLib`, `checkWebGLSupport`, `MultiTextureBatcher`.
- **Text**: `HorizontalAlign`, `VerticalAlign`, `TextFieldType`, `TextFieldInputType`, `HtmlTextParser`, `BitmapFont`, `BitmapText`, `measureText`/`getFontString`, `TextField`, `StageText`, `InputController`, `tokenize`/`splitGraphemes`.
- **System**: `Capabilities`.
- **localStorage**: namespace object — `import { localStorage } from '@kurot/core'`, then `localStorage.getItem(...)`.
- **External**: `ExternalInterface` (named, not namespaced).
- **Resource**: `Resource`/`resource` (shared instance), `ResourceItem`, `ResourceType`, `ResourceConfig`, `ResourceLoader`, `ResourceEventType`/`ResourceEvent`, `AnalyzerBase`, `ImageAnalyzer`, `JsonAnalyzer`, `TextAnalyzer`, `SoundAnalyzer`, `SheetAnalyzer`.

`benchmark/` is dev-only tooling and is **not** exported from `index.ts`.

## 5. Migration gotchas (1.0.0 breaking changes vs. Egret)

1. `.hashCode` / `HashObject` / `IHashObject` removed entirely. Use `===` or
   `WeakMap`-keyed lookups for identity, not integer hash codes.
2. `Resource.instance` singleton getter removed — import the shared instance:
   `import { resource } from '@kurot/core'`.
3. Multi-Player listener registration (`addStructureChangeListener` etc.) on
   `DisplayObject`/`DisplayObjectContainer` removed. The engine is single-
   Player by design (static hooks set directly by `Player`'s constructor).
   `architecture.md` §3.5 now documents this correctly (corrected 2026-08-12).
4. `WebGLRenderContext.getInstance()` / `resetInstance()` removed — `Player`
   constructs the context directly per canvas.
5. Internal fields are `$`-prefixed (`$x`, `$y`, `$renderDirty`, ...) to mark
   them as not part of the public API, even though TS can't enforce privacy
   across the package boundary.
6. Vendor-prefix fallbacks removed (`experimental-webgl`, `webkitAudioContext`,
   `webkit/moz` fullscreen) along with the hand-rolled base64 implementation —
   `Base64Util.encode()` now takes `ArrayBuffer`, not `string`.
7. `Texture.getPixel32`/`getPixels`/`toDataURL` deprecated — use
   `RenderTexture.getPixel32` instead.
8. hitTest return values changed `null` → `undefined` throughout.
9. Egret's `RenderNode` intermediate representation and the "interface + Web
   impl + Native impl" triple-file pattern are gone. No native-wrapper target
   exists — Kurot is web/canvas-only.

## 6. Not-yet-implemented (roadmap docs — don't treat as current behavior)

- `docs-internal/event-api-modernization.md` / `docs-internal/eventmap-decision.md`
  (gitignored, local-only): proposals for a generic `EventMap`-typed
  `addEventListener`. **Not implemented** — listeners are still typed
  `(e: Event) => void`, requiring `as XxxEvent` casts at call sites.
- `docs/pixi-alignment.md`: forward-looking roadmap (dynamic texture slots
  beyond 8, Shader Bits composition, third-party pipe registry, KTX2 textures,
  WebGPU backend). `MultiTextureBatcher.MAX_TEXTURES` is still hardcoded to 8.
- `docs-internal/core-review.md` (gitignored, local-only): catalog of ~12
  known minor issues (B1–B12); a few are fixed (HashObject removal), most
  are still open — see that file for the current list before assuming
  something is or isn't a bug, if it's present in your checkout.

## 7. Task → file map

| I want to...                               | Look at                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Add a new DisplayObject subclass           | `display/DisplayObject.ts`, model it on `display/Shape.ts`                                                       |
| Add a new filter                           | `filters/`, follow `BlurFilter.ts`'s ping-pong dual-pass pattern; GPU side in `player/webgl/pipes/FilterPipe.ts` |
| Change how instructions are built/executed | `player/webgl/WebGLRenderer.ts`, `player/webgl/InstructionSet.ts`                                                |
| Add a new resource type/parser             | `resource/analyzers/`, register in `Resource.ts`                                                                 |
| Debug a texture-batching issue             | `player/webgl/MultiTextureBatcher.ts`, `player/webgl/WebGLDrawCmdManager.ts`                                     |
| Change text layout/wrapping                | `text/WordWrap.ts`, `text/TextMeasurer.ts`                                                                       |
| Understand dirty-flag propagation          | `display/DisplayObject.ts` (`$markDirty`, `$cacheDirtyUp`, `$renderDirtyUp`)                                     |
| Run perf tests                             | `benchmark/`, `pnpm benchmark` (see package README)                                                              |
