# @kurot/core — AI context map

Read this before exploring `src/`. It is a compressed map of the package so an
agent unfamiliar with Kurot does not need to re-derive the architecture from
scratch on every session. Treat the package source and its `src/index.ts`
barrel as the authority for current behavior and exports.

Package identity: `@kurot/core@2.3.3`, published. It provides Kurot's scene graph,
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
│                   two are internal), InstructionSet, and pipes/ (Bitmap/BitmapText/Graphics/Mesh/Text/
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
│                   CustomFilter, MultiPassFilter, BloomFilter. GPU execution in player/webgl/;
│                   push/pop scene integration in player/pipes/.
├── text/           TextField, BitmapText/BitmapFont, StageText (DOM overlay, INPUT mode only),
│                   HtmlTextParser, InputController, TextMeasurer, TextSegmentation,
│                   LineBreaks, TextLineLayout, WordWrap.
├── resource/        Resource class + `resource` singleton, ResourceLoader, analyzers/
│                   (Image/Json/Text/Sound/Sheet/Font). Async, resource.json-driven (RES-compatible).
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
- A `scrollRect` clips a fixed viewport at local (0,0); its x/y translate the
  content, not the clip. WebGL's nested/rotated stencil path must use the same
  viewport origin as its axis-aligned scissor path. Rectangle masks retain
  their own local x/y. See `player/pipes/MaskPipe.ts`.
- `CanvasRenderer` is not purely a fallback. The WebGL backend depends on it
  internally to rasterize Graphics/Text to offscreen canvases before texture
  upload, and to snapshot `RenderTexture`. Don't reason about it as dead code
  when WebGL is active.
- The 2.3.2 TextField outline fix uses render-only margins, including rich
  run strokes. `text/TextRenderBounds.ts` supplies padding; `player/render-bounds.ts`
  includes descendant ink in caches and effect captures. Layout measurements and
  hit areas remain unchanged. Input viewports and external clips remain exact;
  fully hidden lines are skipped. See `docs/text-layout.md` for validation.
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
- GPU filter arrays execute in order. `CustomFilter.from()` takes explicit
  WebGL 1/2 sources with numeric uniforms and auxiliary full-image BitmapData
  bindings. `MultiPassFilter` retains earlier/original inputs for an acyclic
  pass graph; `BloomFilter` is an LDR extraction/blur/composite example.
  See `docs/filters.md` for exact UV, alpha, resolution and resource contracts.
- `BlurFilter.quality` controls pass pairs (1–16); large radii downsample to
  stay within the existing 32-physical-pixel shader tier. Glow/DropShadow keep
  their existing fixed-sample shader and do not use their quality metadata.
- Canvas 2D skips CustomFilter, MultiPassFilter and BloomFilter, including the
  Canvas capture used by cacheAsTexture and RenderTexture. Built-in Blur, Glow
  and DropShadow use CSS approximations; ColorMatrix uses CPU pixels. These
  fallbacks are not pixel-equivalent to WebGL. Do not cache GPU shader effects
  through those capture APIs. See docs/filters.md.
- Filter setters invalidate weakly attached users. Direct uniform/binding edits
  need `filter.invalidate()`. Auxiliary canvas/video edits additionally need
  `BitmapData.invalidate(source)` for upload refresh.
- Intermediate filter targets share a 16-entry / 64 MiB idle pool. Active targets,
  subtree captures and auxiliary uploads are separate. Player.destroy releases
  idle effect targets and auxiliary uploads. Shader programs are cached per GL
  context and source; compile/link failures throw and abort the failed frame.
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
| `RenderPipe`                             | Interface implemented once per display-object category (`BitmapPipe`, `GraphicsPipe`, `MeshPipe`, `TextPipe`, `FilterPipe`, `MaskPipe`, `ParticlePipe`). It defines `addToInstructionSet()` (build), `updateRenderable()` (patch), and optional `destroyRenderable()` cleanup. The current renderer does not invoke cleanup merely because an object leaves the stage. Instructions are dispatched by `renderPipeId`.                                                                  | `player/RenderPipe.ts`, implementations in `player/pipes/`                                                                                                                           |
| `structureDirty` vs `renderDirty`        | `structureDirty` (on `InstructionSet`): topology changed (child added/removed/reordered, filter/mask changed) → full rebuild. `renderDirty` (on `DisplayObject`, propagated via `$renderDirtyUp()`): only visual data changed (position/alpha/tint/texture) on an object whose instruction-list slot is still valid → patch only, no rebuild.                                                                                                                                          | Propagated in `display/DisplayObject.ts` (`$markDirty()`, `$cacheDirtyUp()`, `$renderDirtyUp()`); consumed in `player/webgl/WebGLRenderer.ts` `render()`                             |
| `RenderGroup`                            | A `DisplayObjectContainer` with `isRenderGroup = true`. Gets its own independent `InstructionSet` (tracked via `WeakMap`/`WeakRef` in `WebGLRenderer`). Structural changes inside the group never force the parent to rebuild — the parent set holds a single `renderGroup` instruction pointing at the child set.                                                                                                                                                                     | `isRenderGroup` field: `display/DisplayObjectContainer.ts`; group handling: `player/webgl/WebGLRenderer.ts` (`_buildRenderGroup()`, `markStructureDirty()`, `markRenderableDirty()`) |
| `cacheAsTexture` vs `cacheAsBitmap`      | `cacheAsBitmap` is a pure alias for `cacheAsTexture(true/false)`. `cacheAsTexture(options)` accepts `{resolution?, scaleMode?}` and creates a `DisplayList` (offscreen Canvas 2D buffer), reused across frames until dirty. On WebGL it's drawn as a single `displayListCache` instruction; rasterization still goes through `CanvasRenderer`, then the result is uploaded as a GL texture.                                                                                            | `display/DisplayObject.ts`; `player/canvas/DisplayList.ts`; `player/webgl/WebGLRenderer.ts` (`_executeDisplayListCache()`)                                                           |
| `DrawCmdManager` (`WebGLDrawCmdManager`) | Queue of `DrawCmd` records (12 types: TEXTURE, RECT, PUSH*MASK, POP_MASK, BLEND, RESIZE_TARGET, CLEAR_COLOR, ACT_BUFFER, ENABLE_SCISSOR, DISABLE_SCISSOR, SMOOTHING, MULTI_TEXTURE) sitting between `RenderPipe`s and actual GL calls. Auto-merges consecutive compatible commands. `WebGLRenderContext._flush()` walks it once per frame. This is the real batching layer — distinct from `MultiTextureBatcher`, which only assigns texture \_slots* for the `MULTI_TEXTURE` command. | `player/webgl/WebGLDrawCmdManager.ts`                                                                                                                                                |
| `WebGLRenderContext` lifecycle           | Constructed directly by `Player` (no factory/singleton). Auto-selects `webgl2` (ShaderLib2, GLSL ES 3.00) falling back to `webgl` (ShaderLib, GLSL ES 1.00). Listens for `webglcontextlost`/`webglcontextrestored`; on restore, re-creates GPU buffers, clears the shader cache, invalidates tracked `BitmapData.webGLTexture` refs, and tells `WebGLRenderer` to force a full instruction rebuild.                                                                                    | `player/webgl/WebGLRenderContext.ts`                                                                                                                                                 |
| `Player` vs `Stage`                      | `Stage` is a `DisplayObjectContainer` subclass: root of the scene graph, holds `stageWidth`/`stageHeight`/`scaleMode`/`orientation`/`frameRate` (proxies to the global `ticker`). No rendering logic itself. `Player` owns the `<canvas>`, constructs the WebGL-or-Canvas2D renderer, registers with `ticker` on `start()`, and calls `renderer.render(stage, buffer, matrix)` every tick. One `Player` per app — see §2.                                                              | `display/Stage.ts`, `player/Player.ts`                                                                                                                                               |
| Logical size vs render resolution        | `ScreenAdapter` keeps Stage and touch coordinates in logical units while sizing the Canvas backing store independently from its CSS size. `KurotOptions.resolution` defaults to `min(devicePixelRatio, 2)` and `ScreenAdapter.resolution` can change it at runtime. `Player` supplies the logical-to-physical root matrix; text, automatic display-list caches, and effect buffers inherit the resulting renderer resolution unless explicitly overridden.                             | `player/ScreenAdapter.ts`, `player/Player.ts`, `player/pipes/TextPipe.ts`, `player/canvas/DisplayList.ts`                                                                            |
| GPU texture GC                           | `GraphicsPipe`/`TextPipe` register cached textures through `RenderContext.registerTextureForGC()`. The WebGL context owns the module-level `FinalizationRegistry`; explicit destruction unregisters the token and deletes the texture immediately.                                                                                                                                                                                                                                     | `player/RenderContext.ts`, `player/pipes/GraphicsPipe.ts`, `player/pipes/TextPipe.ts`, `player/webgl/WebGLRenderContext.ts`                                                          |

## 4. Public API surface (`src/index.ts`)

Re-export order: `events`, `geom`, `utils`, `display`, `net`, `filters`,
`media`, `player`, `text`, `system`, then `localStorage` (namespaced),
`ExternalInterface` (named), `resource`.

- **Events**: `Event`, `EventMap` (type), `EventPhase`, `IEventDispatcher`, `EventDispatcher`, `FocusEvent`, `HTTPStatusEvent`, `IOErrorEvent`, `ProgressEvent`, `StageOrientationEvent`, `TextEvent`, `TimerEvent`, `TouchEvent`.
- **Geom**: `Point`/`sharedPoint`, `Rectangle`/`sharedRectangle`, `Matrix`/`sharedMatrix`.
- **Utils**: `NumberUtils`, `Base64Util`, `toColorString`, `Logger`/`LogLevel`, `Timer`/`TimerEvents`, `ByteArray`/`Endian`, `registerFontMapping`/`cacheFontResource`, `DebugLog`.
- **Display**: enums (`BitmapFillMode`, `BlendMode`/`blendModeToNumber`/`numberToBlendMode`, `CapsStyle`, `GradientType`, `JointStyle`, `OrientationMode`, `StageScaleMode`); `DisplayObject`/`RenderMode`/`RenderObjectType`/`DisplayObjectEvents`/`CacheAsTextureOptions`; `DisplayObjectContainer`, `Stage`, `Graphics`/`setGraphicsHitTest`, `Shape`, `Sprite`, `Bitmap`/`setBitmapPixelHitTest`, `Mesh`; textures: `BitmapData`/`CompressedTextureData`, `Texture`/`textureScaleFactor`, `RenderTexture`, `SpriteSheet`; `PathCommandType`/`GraphicsCommand` (type).
- **Net**: `HttpMethod`/`HttpMethodType`, `HttpResponseType`/`HttpResponseTypeType`, `HttpRequest`/`HttpRequestEvents`, `ImageLoader`/`ImageLoaderEvents`.
- **Filters**: `Filter`, `BlurFilter`, `ColorMatrixFilter`, `GlowFilter`, `DropShadowFilter`, `CustomFilter`, `MultiPassFilter`, `BloomFilter`; types `CustomFilterOptions`, `CustomFilterUniform`, `FilterProgramSource`, `FilterTexture`, `FilterPass`, `FilterPassInput`, `BloomFilterOptions`.
- **Media**: `Sound`/`SoundType`/`SoundEvents`, `SoundChannel`, `Video`.
- **Player**: `Player`, `createPlayer`/`KurotApp`/`KurotOptions`; ticker: `SystemTicker`, `ticker`, `getTimer`, `setupLifecycle`, `START_TIME`, `invalidateRenderFlag`/`setInvalidateRenderFlag`, `requestRenderingFlag`/`setRequestRenderingFlag`, `Renderable`; rendering: `InstructionSet`/`Instruction`, `RenderPipe` (type), `CanvasBuffer`, `hitTestBuffer`, `CanvasRenderer`, `DisplayList`; input/layout: `TouchHandler`, `ScreenAdapter`/`StageDisplaySize`; WebGL: `WebGLRenderer`, `WebGLRenderContext`, `WebGLRenderBuffer`, `WebGLRenderTarget`, `WebGLVertexArrayObject`, `WebGLDrawCmdManager`, `WebGLProgram`, `ShaderLib`, `checkWebGLSupport`, `MultiTextureBatcher`.
    - `RenderContext` / `RenderBuffer` (`player/RenderContext.ts`, `player/RenderBuffer.ts`) are internal backend-neutral contracts and are not re-exported.
- **Text**: `HorizontalAlign`, `VerticalAlign`, `TextFieldType`, `TextFieldInputType`; types `ITextStyle`, `ITextElement`, `IWTextElement`, `ILineElement`, `IHitTextElement`, `BitmapFontOptions`; `HtmlTextParser`, `BitmapFont`, `BitmapText`, `measureText`/`getFontString`, `TextField`, `StageText`, `InputController`, `tokenize`/`splitGraphemes`.
- **System**: `Capabilities`.
- **localStorage**: namespace object — `import { localStorage } from '@kurot/core'`, then `localStorage.getItem(...)`.
- **External**: `ExternalInterface` (named, not namespaced).
- **Resource**: `Resource`/`resource` (shared instance), `ProgressCallback`, `ResourceEventListener`, `ResourceItem`, `ResourceType`, `ResourceConfig`/`ResourceConfigData`/`ResourceConfigEntry`, `ResourceLoader`, `ResourceEventType`/`ResourceEvent`, `AnalyzerBase`, `ImageAnalyzer`, `JsonAnalyzer`, `TextAnalyzer`, `SoundAnalyzer`, `SheetAnalyzer`, `FontAnalyzer`.

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

| I want to...                               | Look at                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a new DisplayObject subclass           | `display/DisplayObject.ts`, model it on `display/Shape.ts`                                                                                                                      |
| Add a new filter                           | `docs/filters.md`, `filters/CustomFilter.ts`, `filters/MultiPassFilter.ts`; execution in `player/webgl/WebGLFilterSystem.ts`, scene integration in `player/pipes/FilterPipe.ts` |
| Change how instructions are built/executed | `player/webgl/WebGLRenderer.ts`, `player/InstructionSet.ts`                                                                                                                     |
| Add a new resource type/parser             | `resource/analyzers/`, register in `Resource.ts`                                                                                                                                |
| Debug a texture-batching issue             | `player/webgl/MultiTextureBatcher.ts`, `player/webgl/WebGLDrawCmdManager.ts`                                                                                                    |
| Change text layout/wrapping                | `text/LineBreaks.ts`, `text/TextLineLayout.ts`, `text/TextSegmentation.ts`, `text/TextMeasurer.ts`; `docs/text-layout.md`                                                       |
| Understand dirty-flag propagation          | `display/DisplayObject.ts` (`$markDirty`, `$cacheDirtyUp`, `$renderDirtyUp`)                                                                                                    |
| Run perf tests                             | `examples/benchmark/`, `pnpm benchmark`; automated Kurot/PixiJS/Egret comparison via `pnpm benchmark:compare`                                                                   |

### Mesh geometry and batching

Mesh vertices are local positions; texture trim offsets do not shift geometry.
UVs are relative to the unrotated texture region; both backends map atlas
rotation during sampling. Resize geometry using scaleX/scaleY. After mutating
vertices, UVs, or indices, call updateVertices(). WebGL keeps Mesh indices
separate from quad indices and splits oversized meshes into ordered batches
with local index remapping (player/webgl/split-mesh.ts).

## Text layout in 2.0.1

Word-wrapped text uses Unicode 17.0 UAX #14, dictionary tailoring for SA scripts
and alphabetic overflow tailoring. Style runs never introduce break positions.
Core 2.2.1 tailors rules by imported function identity and filters optional
breaks through grapheme boundaries. Character wrapping also uses complete
graphemes. Never introduce a break inside a cluster; an oversized cluster
overflows intact. The untailored default profile stays unchanged for Unicode
conformance. `TextSegmentation.ts` shares cached word/grapheme segmenters;
ordinary and emergency layout reuse a paragraph's UTF-16 grapheme end offsets.
No text or segmentation results are retained globally. See [text layout](text-layout.md).
Automatic-wrap spaces count in source offsets but not painted width. Core's
Canvas renderer advances input indices by line.charNum, including hidden spaces
and CRLF; do not derive the next line's source offset from painted text lengths.
See [text layout](text-layout.md).

## Resource configuration change in 2.0.0

`ResourceConfigEntry.subkeys` is an object map, and Core rejects legacy strings
before mutating the resource registry. See
[the resource-default contract](../../ui-document/docs/resource-nine-slice.md)
for conversion and compilation boundaries.

## Text layout contract in 2.1.0

Explicit `TextField.multiline = false` renders the first hard-separated line
without width wrapping. Dynamic fields default to multiline and input fields
to single-line until assigned; explicit intent survives type changes.
`TextField.invalidateTextMetrics()` clears line measurements after a late-loaded
font becomes ready. Core does not implement Label font shrinking; that is a
separate UI capability requiring Core 2.1.0 or later.
See [text layout](text-layout.md) for the Core contract and
[Label text layout](../../ui/docs/label-text-layout.md) for fit bounds, state
restoration and shared-schema boundaries.

## Independent text measurement in 2.3.0

`TextField.measureText(width = NaN)` returns complete content width/height without
changing rendered constraints, line caches, scrolling or dirty flags. NaN is
unconstrained; finite nonnegative widths are accepted; other widths throw.
Rich-text line height follows the largest run on that line rather than the
base size; blank lines retain their applicable style. Assigning plain `text`
always clears a previous rich flow, including identical string assignments.
In 2.3.1, an unstyled blank run uses the base size rather than borrowing a
later styled run's size. See `test/TextMeasurement.test.ts` and `docs/text-layout.md`.

## Bitmap fill modes in 2.3.3

Both BitmapPipe and CanvasRenderer honor repeat/clip through internal
`player/bitmap-fill.ts`. Repeat periods use original logical texture dimensions,
including trim margins; edge regions crop source pixels. Rotated atlas coordinates
and tinting remain supported. Nine-slice applies only to scale. CanvasRenderer is
also the nested bitmap-cache rasterizer, so both render paths must stay aligned.
See docs/bitmap-fill.md. This compatible patch requires application installation
and rebuild, not another UI/CLI/ui-runtime version bump.

## Bitmap fonts in 2.2.0

[bitmap-fonts.md](bitmap-fonts.md) documents the headless bitmap-font dependency,
FontAnalyzer and BitmapTextPipe. ResourceType.Font is built in; BitmapText
now draws via WebGL/Canvas. BitmapFontOptions controls page ownership. Native
font data comes from @kurot/bitmap-font; do not reimplement parsing/layout here.
The dependency is published @kurot/bitmap-font ^0.1.0, with no local override.
BitmapText.measureText() leaves rendered constraints and layout caches unchanged;
text borrows the font and the resource/caller retains ownership. Font pages are
full, unrotated textures at scale factor 1. Core 2.1.1 does not include these
changes. Core 2.2.0 is published with its registry bitmap-font dependency.
