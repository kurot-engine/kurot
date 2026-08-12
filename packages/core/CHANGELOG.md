# Changelog

All notable changes to `@blakron/core` are documented here.

---

## [1.0.12] — 2026-08-12

This release simplifies renderer initialization before the engine enters feature development. `Player` now attempts WebGL directly on the application canvas instead of creating a second temporary WebGL context solely for capability detection.

### Changed

- **Direct WebGL initialization** — `Player` now requests `webgl2`, then `webgl`, on the supplied application canvas. If both fail, initialization falls through to the existing Canvas 2D renderer.
- **No probe canvas allocation** — removed `Player`'s call to `checkWebGLSupport()`, avoiding a redundant temporary canvas and WebGL context that could consume resources or produce a false fallback on constrained devices. The exported utility remains available for compatibility.
- **README refresh** — documents the WebGL/Canvas backend boundary, internal Canvas rasterization duties, current 1.0.12 feature set, committed architecture/resource references, and the latest test pages.

### Tests

- `test/CreatePlayer.test.ts` — expanded: verifies the supplied canvas receives the `webgl2` → `webgl` → `2d` initialization sequence and that no separate WebGL probe canvas is created.

---

## [1.0.11] — 2026-08-12

This release hardens pooled WebGL resource lifecycles after the 1.0.10 rendering-pipeline work. It prevents stale offscreen state from leaking between effects and keeps dynamically sized blur resources within a fixed GPU-memory bound.

### Fixed

- **Complete `WebGLRenderBuffer` reuse reset** — pooled offscreen buffers now reset transform snapshots, tint, texture bindings, draw counts, offscreen coordinates, stencil data, and scissor state before reuse. Buffers are only reused by the WebGL context that created them.
- **RenderBuffer overflow disposal** — when the shared pool is full, pending commands are flushed before discarded buffers dispose their framebuffer and texture, instead of resizing them to a retained 1×1 allocation.
- **Bounded blur framebuffer pool** — temporary blur texture/framebuffer pairs are capped at 16 entries and approximately 64 MiB of RGBA texture memory across all dimensions. The oldest retained pair is explicitly deleted when either cap is reached, preventing unbounded GPU-memory growth when filtered content changes size.
- **Context-restore bookkeeping** — restoring a WebGL context now resets both blur pool entries and their retained-entry count.

### Tests

- `test/WebGLRenderBuffer.test.ts` — new: full transient-state reset, context ownership, and pool-overflow disposal.
- `test/WebGLBlurFramebufferPool.test.ts` — new: count and memory bounds, GPU-resource eviction, byte accounting, and empty-bucket cleanup.

---

## [1.0.10] — 2026-08-12

This release closes the largest architectural gap left over from the Egret port: mask and filter offscreen rendering no longer bypasses the instruction pipeline. The dedicated `_directDraw` tree-walk that mirrored the main `_buildLeaf` switch has been removed, leaving a single shared leaf-dispatch path for both the main pass and offscreen effect buffers. Bundled with it are correctness fixes for offscreen transforms on rotated/scaled targets, multi-instruction renderables, tint inheritance, and several renderer leaks.

### Changed

- **Unified mask rendering through the instruction pipeline** — mask/clip subtrees now build into a reusable scratch `InstructionSet` instead of being drawn via `_directDraw`. Nested effects, cached (`cacheAsBitmap`/`cacheAsTexture`) content, and RenderGroups are preserved inside mask subtrees, and RenderGroups are inlined in mask-local coordinate space. Mask composites are flushed before their pooled framebuffers are released. This removes the duplicated leaf-rendering switch and the divergence between main-pass and effect-pass rendering flagged in the 1.0.9 architecture review.
- **Shared WebGL leaf dispatch** — leaf instruction creation and pipe dispatch are now centralised, so the main build pass and mask rendering share the same path through `BitmapPipe` / `MeshPipe` / `GraphicsPipe` / `TextPipe` / `ParticlePipe`.
- **`InstructionSet`: multiple instructions per renderable** — the per-renderable index map previously stored a single instruction slot, which silently dropped transform refreshes for objects owning more than one transform-bearing instruction (e.g. an effect push together with its leaf). It now tracks an array of indices and refreshes all of them.
- **Precision dirtying for offscreen effects** — `$markTransformDirty` / `$markRenderDirty` are now separated on the offscreen path so cached content and effect buffers refresh only the state that actually changed.

### Fixed

- **Offscreen effect transforms on rotated/scaled targets** — mask and filter offscreen buffers previously only accounted for translation, so compositing broke when the target object was rotated or scaled. An inverse world transform is now applied to convert world-space instructions into the buffer's local coordinate space, and mask compositing uses a dedicated framebuffer draw method for safe UV flipping.
- **Tint inheritance respects the closest non-default ancestor** — a child no longer picks up a distant ancestor's tint when an intermediate ancestor resets tint to the default.
- **RenderGroup rebuild during partial renderer updates** — a RenderGroup is now recalculated when a dirty renderable lands inside it during a partial (non-structural) update pass, instead of being skipped.
- **Renderer leaks and unbounded pools** — `InstructionSet` arrays are cleared and dirty renderables are deduplicated on rebuild; `FilterPipe` and `MaskPipe` now null out their cached state and cap their instruction pools to prevent unbounded growth across frames.

### Tests

- `test/EffectTransform.test.ts` — new: offscreen transform correctness on rotated/scaled targets, and multi-instruction transform refresh.
- `test/InstructionSet.test.ts` — expanded: multi-instruction-per-renderable indexing, array clearing, dirty-renderable deduplication.
- `test/InstructionPool.test.ts` — new: filter/mask pipe pool cap and null-out behaviour.
- `test/RenderGroup.test.ts` — new: RenderGroup rebuild during partial updates, plus mask-subtree RenderGroup inlining.
- `test/WebGLRendererDirty.test.ts` — new: dirty-mark propagation and partial-update correctness.
- `test/WebGLRendererLeaf.test.ts` — new: shared leaf dispatch for main and mask rendering.
- `test/MaskPipe.test.ts` — expanded: complex (nested effects + cached content) mask visual and lifecycle regression.
- `test/WebGLVertexArrayObject.test.ts` — new: VAO sizing and cache-array behaviour used by the new framebuffer draw path.
- `test/DisplayObject.test.ts` — expanded: transform/alpha dirty marking used by the offscreen path.

---

## [1.0.9] — 2026-08-06

### Added

- **`cacheAsTexture()` with resolution and scaleMode** — new PixiJS-style cache API (`options: { resolution, scaleMode }`) with Egret-compatible `cacheAsBitmap` as a boolean alias. `isCachedAsTexture` and `updateCacheTexture()` provide fine-grained control over the cached subtree.
- **Resolution-aware offscreen rendering** — `DisplayList` now supports `resolution` and `actualResolution`, scaled to fit within `maxTextureSize`. Both `CanvasRenderer` and `WebGLRenderer` apply the resolution scale when drawing cached bitmaps, and `scaleMode` controls `imageSmoothingEnabled` / GL filtering.

### Changed

- **Precision dirtying: `$markTransformDirty`** — transform-affecting setters (`x`, `y`, `scaleX`, `scaleY`, `rotation`, `skew`, `alpha`, `visible`, `tint`, `anchorOffset`) now call `$markTransformDirty()` instead of `$markDirty()`, avoiding unnecessary texture regeneration on cached display objects that have only moved or recoloured. `$markDirty` now delegates to `$markTransformDirty` plus sets `$renderDirty`.
- **DisplayList pool capped at 8** — recycled DisplayList objects are now limited to a pool of 8 to prevent unbounded memory growth.
- **DisplayList `release()` releases WebGL textures** — cached bitmaps now properly free their GPU resources when returned to the pool.

### Tests

- `test/DisplayObject.test.ts`: expanded with cache-texture resolution and scaleMode coverage.

---

## [1.0.8] — 2026-08-06

### Fixed

- **TextField: normalize non-string values in `text` setter** — the setter now converts `null`, numbers, and objects to strings via `String(value)` before storing, matching Egret/DOM behaviour. Previously unexpected types could reach the line-layout engine and throw.
- **Resource: track canonical item name for `destroyAll`** — when loading a resource by subkey (e.g. `button_up_png` resolving to the `eui` sheet), the `loadedNames` set now records the parent item name so `destroyAll()` destroys the complete sheet instead of only the requested sub-resource.
- **ResourceConfig: trim subkeys and skip empty entries** — whitespace and empty fragments in comma-separated `subkeys` strings (`" , ,"`) no longer create spurious empty key entries.

### Tests

- `test/TextField.test.ts`: 1 case (non-string value normalization).
- `test/Resource.test.ts`: 2 cases (subkey trimming, parent sheet tracking).

---

## [1.0.7] — 2026-08-06

### Added

- **`destroy()` on BlakronApp** — `createPlayer()` now returns a `destroy()` method that tears down the player, touch handler, screen adapter, and lifecycle listener in one call. `stop()` is now purely resumable (no longer disposes resources); disposal is deferred to `destroy()`. Calling `start()` after `destroy()` throws.
- **ResourceLoader: stable monotonic progress** — replaced the broken `activeCount` / `(total + loaded)` formula with `completedCount` / `totalCount`. Consumer callbacks (`onComplete`, `onError`, `onProgress`) are now wrapped in a `safeNotify` try/catch so exceptions in user code do not corrupt loader bookkeeping or stall the queue.

### Fixed

- **TouchHandler: mouse drag tracking outside canvas** — moved `mousemove`/`mouseup` listeners from `canvas` to `window`, so drag interactions continue tracking after the pointer leaves the canvas bounds. `dispose()` now clears `_touchDownTarget` and resets `_useTouchesCount`.
- **SystemTicker: `setupLifecycle` returns a dispose function** — previously the `visibilitychange` listener was registered with no way to remove it. Now returns a cleanup function that calls `removeEventListener`.

### Tests

- `test/CreatePlayer.test.ts` — new (1 case: destroy lifecycle + stop resumability).
- `test/ResourceLoader.test.ts` — 2 cases (monotonic progress, consumer callback exception resilience).
- `test/TouchHandler.test.ts` — new (1 case: mouse interaction ended outside canvas).

---

## [1.0.6] — 2026-08-06

### Fixed

- **StageText: single-line height alignment** — replaced the padding-based vertical alignment with explicit `top` + `height` positioning. The previous approach used `padding` to distribute remaining space, which could push text outside the visible area when the field height exceeded the font size.

---

## [1.0.5] — 2026-08-06

### Changed

- **StageText: rewritten DOM positioning via display-list matrix** — replaced the manual `localToGlobal()` + `canvas.getBoundingClientRect()` coordinate conversion and accumulated-rotation loop with a single `$getConcatenatedMatrix()` call, applied as a CSS `matrix()` transform on the wrapper div. This correctly handles translation, scale, rotation, and canvas scaling in one step without the per-frame `_gscaleX`/`_gscaleY` ratio bookkeeping. The input element now uses `box-sizing: border-box` with simplified padding calculations for single-line vertical alignment.

---

## [1.0.4] — 2026-08-05

### Fixed

- **TextField: single-line mode no longer wraps at max-width** — `calculateLines` now checks `!this._multiline` before breaking a text segment across lines. Previously, even with `multiline = false`, text segments that exceeded the field's available width would be forcibly split, causing single-line TextFields (especially INPUT type) to overflow vertically. Single-line fields now keep all text on one line regardless of width.

---

## [1.0.3] — 2026-07-27

### Fixed

- **TextField**: Overrode the `width` and `height` **getters**. The class previously only overrode the setters, which in JS/TS shadows the parent getter on `DisplayObject` — so reading `tf.width` / `tf.height` returned `undefined` instead of the explicit or measured value. Both the getter and setter are now overridden together, returning `$explicitWidth`/`$explicitHeight` when set, or the measured content bounds otherwise. This was the root cause of INPUT TextFields rendering at zero size and disappearing.
- **StageText**: Commented out the `_inputDiv.style.clip = rect(...)` line (and its `clearInputElement()` reset). The deprecated CSS `clip` property was firing TS lint warnings (`'clip' is deprecated`); the rect was equal to the element's own `width × height`, so it was a no-op (real clipping is done by `overflow: hidden` + explicit `width`/`height`). Removing it has zero runtime effect and silences the warning.

### Changed

- **examples/text-test.html**: The `Input mode` test case no longer sets `tf.background` / `tf.border` on the TextField. Instead it draws the background as a sibling `Shape` (`graphics.drawRect`) at the same position and dimensions. This decouples the input background from the TextField's own texture, so it is unaffected by any future TextPipe INPUT-mode early-return (which would drop the whole texture, including a self-drawn background). Matches the skin-based pattern used by `@blakron/ui`'s `TextInput`.

---

## [1.0.2] — 2026-07-27

Type-safe event listeners via `EventMap`. `EventDispatcher` now accepts an optional `TMap` generic mapping event-type strings to their concrete `Event` subclasses, so listeners receive the correct subclass without manual `as` casts. Callers that don't declare a map keep working via the existing `(e: Event) => void` fallback overload — fully backward-compatible.

> Note: `1.0.1` was a version-number-only bump with no code changes; it is intentionally omitted from this changelog.

### Added

- **EventDispatcher**: Optional `<TMap extends EventMap>` generic on the class, plus type-safe overloads for `addEventListener`, `removeEventListener`, and `once` keyed by `TMap[K]`. The implementation signature uses a type-erased `AnyListener` to bypass strict-mode parameter contravariance (TS2394). Existing callers see no change.
- **EventMap type**: Exported from `events/index.ts` (`Record<string, Event>`-compatible base for declaring event-type → subclass mappings).
- **Typed event maps** declared at each event source:
  - `DisplayObjectEvents` on `DisplayObject` — covers `TouchEvent.TOUCH_BEGIN/MOVE/END/TAP`, `FocusEvent.FOCUS_IN/OUT`, `Event.ADDED/REMOVED_TO_STAGE`, `Event.ENTER_FRAME`, etc.
  - `HttpRequestEvents` on `HttpRequest` — `HTTPStatusEvent.HTTP_STATUS`, `IOErrorEvent.IO_ERROR`, `ProgressEvent.PROGRESS`, `Event.COMPLETE`.
  - `SoundEvents` on `Sound`.
  - `ImageLoaderEvents` on `ImageLoader`.
  - `TimerEvents` on `Timer` — `TimerEvent.TIMER`, `TimerEvent.TIMER_COMPLETE`.

### Changed

- **InputController / TextField / HttpRequest**: Internal listener registrations and several test sites dropped their `e as TouchEvent` / `e as HTTPStatusEvent` / `e as ProgressEvent` casts now that the dispatcher hands back the correct subclass directly.

### Tests

- Added `test/EventMap.test.ts` (178 lines) covering type-safe dispatch, the untyped fallback overload, `once()` with a typed map, and mistyped-event-name compile errors.
- Added `test/DisplayObject.test.ts` typed-listener coverage.
- Updated `test/EventDispatcher.test.ts`, `test/HttpRequest.test.ts`, `test/HTTPStatusEvent.test.ts`, `test/ProgressEvent.test.ts`, `test/TouchEvent.test.ts` to use the new typed signatures. Total test count: 565 → 583.

---

## [1.0.0] — 2026-07-26

First stable release. From this version forward the public API surface (exports from `src/index.ts`) is committed to backward-compatible evolution per semver.

### Fixed

- **StageText**: Removed 6 development-time `console.log` debug statements (in `resetStageText`, the focus/blur listeners, `initElementPosition`, `executeShow`, and the deferred-focus path) that would spam the console of any production app using text inputs. These were not routed through `Logger` and could not be silenced.
- **WebGLRenderer**: Documented and preserved the per-frame root-buffer projection reset at the end of `render()`. The call `WebGLRenderBuffer.release(WebGLRenderBuffer.create(buffer.context, 0, 0))` looks like a no-op pool cycle but its real effect is the `pushBuffer` / `popBuffer` pair inside `WebGLRenderBuffer.resize()`, which queues an `activateBuffer` command; when `flush()` runs it, `_activateBuffer()` calls `onResize()` and restores the GL projection / viewport to the root canvas size. Without it, any in-frame activation of an offscreen buffer (filters / masks / cacheAsBitmap) leaves the projection set to the offscreen size and the next frame is vertically offset (observed as text and mesh content rendering halfway down the canvas instead of at its set position). The `_nestLevel` guard around it is also preserved with a `DO NOT remove` comment: although `render()` never recurses today, the guard ensures a future WebGL cacheAsBitmap / drawToTexture will only reset the projection on the outermost call. Both pieces were briefly deleted as "dead code" during the 1.0.0 cleanup and immediately reverted after the regression was caught.

### Removed

- **HashObject / IHashObject / `.hashCode`**: Removed entirely. This was a 2014-era port of Java's `Object.hashCode()` identity-comparison pattern, introduced because ES5 had no `Map`/`WeakMap`. With modern JS, object identity comparison is done with `===` and object-keyed lookups with `WeakMap`/`WeakSet` — neither needs an int ID. The last engine-internal consumer (BitmapData's `Map<number, DisplayObject[]>`) was already migrated to a `WeakMap` in 0.6.3, and a full audit found zero remaining reads of `.hashCode` across `src/`, `test/`, and `examples/`. Removing it drops a per-instance field + global counter increment from every `Point`/`Matrix`/`Rectangle`/`Texture`/`BitmapData`/`SpriteSheet`/`Graphics`/`Event`/`EventDispatcher`/`Filter`. **Breaking for any user code that read `.hashCode`** — replace with `WeakMap`-keyed or `===`-based identity.

### Changed

- **WebGL**: Removed the `experimental-webgl` context fallback in `WebGLRenderContext` and `checkWebGLSupport()`. The `experimental-webgl` name was the IE11 / early-Safari / old-Android-Chrome alias; every modern browser that supports WebGL returns the standard `'webgl'` context (Safari 8+ since 2014). Also dropped the redundant `window.WebGL2RenderingContext` / `window.WebGLRenderingContext` feature-detects — `getContext('webgl2')` / `getContext('webgl')` already return `null` when unsupported.
- **Sound**: Removed the `webkitAudioContext` fallback. Prefixed `AudioContext` was last used by Safari <14.1 (2021); standard `AudioContext` is universally supported now.
- **Video**: Replaced the `requestFullscreen` / `exitFullscreen` vendor-prefix dispatchers (`webkitRequestFullscreen`, `mozRequestFullScreen`, `webkitExitFullscreen`, `mozCancelFullScreen`) with native `requestFullscreen()` / `exitFullscreen()`. The unprefixed API has been standard in every browser since 2018.
- **Base64Util**: Replaced the hand-rolled base64 bit-twiddling with native `btoa` / `atob`. The custom implementation was an ES5-era workaround for old IE; `btoa`/`atob` are universally supported since 2014. The chunked `String.fromCharCode` loop preserves performance on large buffers.

### Build

- **package.json**: Added a `prepublishOnly` hook (`npm run clean && npm run build`) so `npm publish` always ships a freshly built `dist/`. `dist/` is gitignored, so without this hook publishing from a fresh clone or CI would emit an empty package.

### Docs

- **README**: Added a stable (1.0.0) badge and an explicit evergreen-browsers-only targeting note. Added a "Migrating from Egret" section listing every 1.0.0 breaking change (`.hashCode`/`HashObject` removal, `Resource.instance` removal, multi-Player listener API removal, `WebGLRenderContext` singleton removal, `$`-prefixed internal fields, vendor-prefix shim removal). Fixed the test count (569 → 565). Replaced the dead `docs/architecture.md` and `docs/resource.md` links (those files were gitignored, never committed, never published) with the in-package `CHANGELOG.md` and the public demo URL.
- **CORE_REVIEW.md → docs/core-review.md**: Moved out of the published tree (`docs/` is gitignored). This file is an internal review/backlog artifact and was never meant for public consumption.

### Notes

- This release consolidates the stabilization work shipped across 0.6.0–0.6.3, plus a final pass removing 2014-era browser-compatibility shims now that the engine targets modern browsers (ES2022 / evergreen browsers only): the internal `$`-prefixed field renames (0.6.0), the removal of the `Resource.instance` singleton, the multi-Player listener registration API, and the `WebGLRenderContext` singleton (0.6.3), the removal of the Java-era `HashObject` / `.hashCode` identity layer (1.0.0), and the removal of dead vendor-prefix fallbacks (`experimental-webgl`, `webkitAudioContext`, `webkit/moz fullscreen`, hand-rolled base64). No further breaking changes are planned for the 1.x line.
- The 1.0.0 cleanup was iterated against the local `reference/pixijs/pixijs-8.17.1` source to confirm the direction matches what a modern TypeScript game engine actually ships (no `experimental-webgl` fallback, no `webkitAudioContext`, no `HashObject` identity layer).

---

## [0.6.3] — 2026-07-25

### Changed

- **Breaking**: Removed the `Resource.instance` singleton getter (and `_instance` field). Callers should use the existing `export const resource` instance directly. The singleton held a process-wide instance that was awkward to reset between sessions/tests and hid the fact that `Resource` is constructed once at module load.
- **Breaking**: Removed the multi-Player listener registration API (`DisplayObject.addStructureChangeListener`, `DisplayObject.addRenderableDirtyListener`, `DisplayObjectContainer.addContainerStructureChangeListener`) and restored direct static-field assignment. The engine is single-Player by design — `Player` now assigns `DisplayObject.$onStructureChange` / `$onRenderableDirty` / `DisplayObjectContainer.$onContainerStructureChange` directly in its constructor and clears them in `destroy()`. The previous listener-chain registry existed only to support multiple Player instances on one page, a scenario that was never actually supported and added overhead to every dirty-marking path.
- **Breaking**: `WebGLRenderContext` is no longer a singleton. Removed `getInstance()` / `resetInstance()` and made the constructor `public`. `Player` now constructs `new WebGLRenderContext(canvas)` directly. On WebGL init failure, references are dropped so the half-constructed context can be GC'd (previously `resetInstance()` had to be called manually).

### Fixed

- **BitmapData**: Fixed a memory leak in the static `_displayList` registry. It was keyed by `bitmapData.hashCode` (a `Map<number, DisplayObject[]>`), so entries for discarded `BitmapData` objects were never removed and kept strong references to both the `BitmapData` and its dependent `DisplayObject`s alive indefinitely. Switched to a `WeakMap<BitmapData, Set<DisplayObject>>` keyed by the `BitmapData` itself, so entries are reclaimed automatically when the `BitmapData` is GC'd. The per-node membership list also moved from `Array` to `Set` for O(1) add/remove.
- **Event**: `resetForPool()` now clears `this.data` before resetting the event type/bubbles/cancelable. Pooled events previously retained the payload from their last dispatch, leaking arbitrary user data (and strong references to render objects) back into the pool and into the next unrelated dispatch.
- **TextPipe**: Added `FinalizationRegistry`-based texture cleanup for `TextField` caches. Nothing in the engine calls `destroyRenderable()` during the normal TextField lifecycle (UI relayouts and virtualized lists just drop references), so cached WebGL textures previously leaked — the GC callback is now the actual reclamation path, mirroring `GraphicsPipe`'s existing pattern. `destroyRenderable()` also now immediately unregisters and deletes the texture for use as an optional explicit entry point.

### Added

- **License**: Added an MIT `LICENSE` file at the package root with the copyright notice.

### Tests

- Added a `TextPipe` test suite covering texture caching, cache invalidation, and the destroy/GC path.

---

## [0.6.2] — 2026-07-24

### Fixed

- **WebGLRenderer**: Ancestor container transform/alpha/tint changes now refresh descendant leaf instructions. Previously, changing a plain container's transform had no effect on WebGL output until a full structural rebuild, since containers never own a leaf instruction of their own.
- **ResourceLoader**: Fixed `activeCount` queue-counting bugs that could hang `start()` indefinitely — the retry path double-decremented the active count, and items with no registered analyzer never decremented it at all. All completion paths (success, failure, synchronous throw, missing analyzer) now retire through a single `finishItem()` entry point.
- **ResourceLoader**: A synchronously-thrown (rather than rejected) analyzer `loadFile()` call no longer wedges the loader — it's now caught and routed through `finishItem()` like any other failure.
- **Resource**: Concurrent `loadGroup()` calls no longer overwrite each other's queue/callbacks on the shared `ResourceLoader` instance. Calls are now serialized through a persistent promise chain (`groupLoadQueue`), each still resolving/rejecting independently.
- **ByteArray**: `bytesAvailable`, `validate()`, and the internal `_validate()` bounds check now use the logical write position instead of physical buffer capacity, preventing reads of unwritten, zero-filled memory when `bufferExtSize` pre-allocates extra capacity ahead of writes.
- **EventDispatcher**: `once()` listeners could fire more than once when a nested/reentrant `dispatch()` on a different dispatcher drained the shared once-listener queue. The queue now tracks each listener's owning dispatcher and only pops entries belonging to the dispatcher currently draining.

### Removed

- **ByteArray**: Removed the redundant `readAvailable` getter, which duplicated `bytesAvailable` once both were redefined against the logical write position.
- **Resource**: Removed the unused `isConfigLoaded` field (written by `loadConfig()` but never read anywhere).

### Changed

- **Docs**: Added JSDoc coverage across `WebGLRenderer`'s build/execute pipeline (`render`, `_releaseInstructions`, `_buildLeaf`, `_buildFilter`, `_buildClip`, `_buildScrollRect`, `_makeCacheInstruction`, `_executeInstructions`, `_applyTransform`, `_executeDisplayListCache`, `_directDraw`) and consolidated scattered inline comments into method-level doc comments in `Resource.loadGroup`, `ResourceLoader.loadItem`, and `WebGLRenderer._updateDirtyRenderables` / `_buildInstructions`.

### Tests

- Added coverage for `ResourceLoader` (concurrent requests, retry exhaustion, missing analyzers, promise rejection, thread-count limits).
- Added coverage for `Resource` concurrent group loads and failure scenarios.
- Added coverage for `ByteArray`'s logical-vs-physical read boundary with `bufferExtSize`.
- Added coverage for `EventDispatcher.once()` behavior across nested/reentrant dispatch.

---

## [0.6.1] — 2026-07-22

### Added

- **HttpRequest**: `status` getter exposing the HTTP response status code. Dispatches `HTTPStatusEvent` before `COMPLETE`/`IO_ERROR`, and now treats 4xx/5xx responses and status `0` (CORS/blocked preflight) as `IO_ERROR` failures instead of silently completing, matching `fetch()` error semantics.
- **HttpRequest**: `setRequestHeader()` with a `_pendingHeaders` queue — headers set before `open()` are queued and applied during `send()`.
- **Sound**: Generation-based cancellation so a pending async load callback can't update state after `close()`.

### Tests

- Added test coverage for `HttpRequest` (2xx/4xx/5xx responses, network failures, status exposure) and `ImageLoader`.

---

## [0.6.0] — 2026-05-07

### Changed

- **Breaking**: Renamed internal fields across `DisplayObject`, `DisplayObjectContainer`, `Bitmap`, `Graphics`, `Mesh`, `Shape`, `Sprite`, `Stage`, `BitmapData`, `RenderTexture`, `TouchEvent`, `ColorMatrixFilter`, and related modules to use a `$` prefix, distinguishing internal/engine-owned state from public API surface.
- Moved stage event lists from `DisplayObjectContainer` to `DisplayObject`.
- `EventDispatcher` now invokes listeners with an explicit `this` context.

---

## [0.5.17] — 2026-05-06

### Changed

- **Text rendering**: Switched to Egret-style `textBaseline='middle'` rendering (advancing `drawY` by half the line height before drawing) instead of manual baseline offset calculation, simplifying both rendering and hit-testing. Later switched to `textBaseline='alphabetic'` so positioning relies on stable `actualBoundingBox` metrics across OS font substitution (e.g. Arial → SF Pro on iOS).

---

## [0.5.16] — 2026-05-05

### Added

- **Particle system**: Rendering support for both the canvas and WebGL renderers, including a new `ParticlePipe`.
- **Test coverage**: Added suites for `BlendMode`, `CustomFilter`, `Shape`, `Sprite`, `Stage`, spatial operations, `Bitmap`, `BitmapData`, `Mesh`, `Texture`, `TouchEvent`, `SpriteSheet`, `DebugLog`, `Filter`, `HTTPStatusEvent`, `ProgressEvent`, and `Sound`/`SoundChannel` (with an `Audio` mock and isolated module state via dynamic imports).

### Fixed

- Particle offset calculation and missing per-particle alpha.
- `Bitmap` reference counting when its texture changes while already on stage.
- `BitmapText` layout not invalidating on width/height change (affects line-breaking); `TextField` not invalidating on size change.

### Changed

- **Word wrapping**: Replaced regex-based tokenization with `Intl.Segmenter` for locale-aware word/grapheme segmentation, correctly handling Latin, CJK, Thai/Khmer, and mixed-script text.
- Pruned trivial property/constructor tests in favor of P1 edge-case coverage (boundary conditions, sorting).

---

## [0.5.9] — 2026-05-05

### Added

- **WebGL2**: Uniform Buffer Object (`UBOManager`) support for frame-level projection uniforms, later reverted in favor of direct `gl.uniform*()` uploads after it caused stale projection state when switching render buffers (fixed once via `updateProjection()`, then removed entirely for simplicity — see 0.5.10).
- Dedicated `fullscreen_vert` shader for filter blur passes so each pass sets its own projection uniform independently.

### Fixed

- `projectionVector` uniform not updating correctly for fullscreen quad draw calls.
- GLSL uniform block binding syntax causing compilation issues on some WebGL implementations; removed unused `uTextureSize` uniform (briefly re-added, then dropped again).

---

## [0.5.10] — 2026-05-05

### Changed

- **WebGL2**: Removed `UBOManager` — reverted to direct `gl.uniform*()` uploads for `projectionVector` on both WebGL1 and WebGL2 paths. Multi-texture fragment shader simplified to constant (rather than dynamic) sampler indexing for GLSL ES 3.00 compatibility.

---

## [0.5.2] — 2026-05-04

### Added

- **WebGL2 support**: Prefers a WebGL2 context at initialization with WebGL1 fallback for older devices, via a unified GL type alias. All GLSL shaders received an explicit `#version 100` directive for WebGL1.
- **Graphics**: `FinalizationRegistry`-based texture cleanup to prevent GPU memory leaks when `Graphics` objects are garbage-collected.

### Fixed

- `MaskPipe` scissor rect calculation for scroll offsets — content scroll offsets were incorrectly included in the scissor rect instead of only screen offsets.
- Shape graphics commands were cleared on stage removal, preventing shapes from re-rendering when re-added to the display list.

### Changed

- Reorganized the player module: canvas rendering into `player/canvas/`, WebGL pipes into `player/webgl/pipes/`, shaders into `player/webgl/shaders/`, each with a barrel `index.ts`.

---

## [0.3.11] — 2026-05-03 to 2026-05-04

### Fixed

- **Text rendering**: Corrected vertical-centering math for middle-aligned text under `textBaseline='top'` (the em-square was being centered instead of the actual glyphs) — measures font metrics to compute a correction offset, then fixes a sign error in that correction.
- `Event.setDispatchContext()` now preserves the original dispatch target during bubble/capture phases, only assigning `_target` at the `AT_TARGET` phase or on initial assignment.
- Renderables with empty graphics commands at build time (e.g. UI components whose `Validator` fills commands a frame later) now trigger a full instruction rebuild once content becomes available, instead of never rendering.
- `MaskPipe` scissor rect calculation corrected to avoid double-applying offsets already baked into the matrix via scroll-rect handling.

### Changed

- Added `willReadFrequently` hints to canvas 2D contexts used for pixel readback (`RenderTexture.getPixel32`, hit testing), avoiding repeated browser warnings.
- Removed debug logging that had been added for touch hit-testing (`CheckBox`/`RadioButton`/`Button`, `TouchHandler`).

---

## [0.3.3] — 2026-05-03

### Fixed

- **FilterPipe / MaskPipe**: Correct GL state management to prevent stale blend state leaking between filter and mask passes.

### Changed

- Replace explicit `undefined` assignments with optional property syntax across the codebase.
- Declare `children` field explicitly in `DisplayObjectContainer` and remove non-null assertions.

---

## [0.3.2] — 2026-05-02

### Added

- **Resource manager**: Comprehensive resource management system with full documentation — supports asset loading, caching, and lifecycle management.
- **Capabilities system**: Runtime feature-detection API for querying WebGL extensions and platform capabilities.
- **TextPipe**: Complete text rendering pipeline integrated into the player.

### Changed

- **Namespace migration**: Renamed all internal namespaces from `Heron` → `Blakron` to align with the new package identity.
- Fixed main entry point path in `package.json`.
- Added comprehensive migration status and API compatibility guide (`docs/migration.md`).

---

## [0.2.4] — 2026-04-11

### Added

- **TextField rendering pipeline**: Full Canvas 2D and WebGL rendering path for `TextField`, including scroll offset, padding, clipping, and native `INPUT` mode support.
    - Prevents double-text artifact when native input is focused.
    - Fixes canvas buffer scaling and border handling in coordinate mapping.
    - Refines `StageText` padding and clipping for better vertical alignment.
- **Benchmark scenes**: `rapid-churn` and `texture-swap` scenes added to the benchmark suite with Egret comparison.
- **Example pages**: Index page, mesh test, net test, video test, and sound test HTML examples.
- **Video rendering**: Dynamic scaling and per-frame WebGL texture updates.

### Fixed

- Mesh rendering and tint color calculations corrected.
- Mesh animation angle calculation improved.
- Range input overflow in mesh test layout.
- Blend mode state restoration and WebGL context-loss handling.

### Changed

- Example UI modernized with glassmorphism design and consistent layout.
- Scale mode updated from `exactFit` to `noScale` in examples.
- Benchmark build configuration and scripts added.

---

## [0.2.3] — 2026-04-11

### Added

- **WebGL performance benchmarking suite**: Comprehensive multi-scene benchmark with detailed logging and dynamic-transform scene.
- **Bounds caching**: `DisplayObject` now caches computed bounds to avoid redundant recalculation.
- **Blend mode state management**: Explicit blend mode tracking in the render pipeline.

### Fixed

- Drop shadow padding calculation in filter pipeline.
- Blend mode state not restored after filter/pipe passes.

### Changed

- Filter compositing and blur pipeline restructured for clarity.
- `WebGLRenderContext` reorganized with section comments and `readonly` fields.
- Imports consolidated to explicit module paths across player and display modules.

---

## [0.2.0] — 2026-04-09

### Added

- **Multi-texture batching**: WebGL renderer now batches up to 8 textures per draw call, dramatically reducing GPU state changes.
- **Two-pass separable Gaussian blur**: Ping-pong FBO approach for high-quality, GPU-efficient blur filters.
- **GPU-accelerated CSS filters**: Canvas filter rendering path optimized with CSS filter fallback.
- **Mask rendering**: `DisplayObject` mask support with correct graphics state management.
- **Gradient rendering**: Refactored gradient pipeline in the filter system.
- **Render instruction pipeline**: Dirty-tracking system drives incremental display list updates.
- **Render object type tracking** and render groups for batching optimization.
- **Graphics caching**: Canvas-to-WebGL rasterization cache for static `Graphics` objects.
- **Pixel-perfect hit testing**: Accurate pointer event dispatch using rendered pixel data.
- **Comprehensive unit tests**: `vitest` configuration and test suite covering core modules.

### Changed

- `WebGLRenderContext` fully reorganized with section comments and `readonly` fields.
- Event handler naming standardized across player and WebGL modules.

---

## [0.1.0] — 2026-04-09 _(initial release)_

### Added

- **Core display hierarchy**: `DisplayObject`, `DisplayObjectContainer`, `Stage`, `Sprite`, `Bitmap`, `Mesh`, `Shape` with full Egret-compatible API.
- **Event system**: Object-pooled event dispatch, specialized event types (`TouchEvent`, `TimerEvent`, `Event`), and `EventDispatcher`.
- **WebGL rendering pipeline**: `DisplayList` caching, `SystemTicker`, `ScreenAdapter` integration.
- **Text system**: `TextField` with HTML parsing, `BitmapFont` / `BitmapText` for texture-based text.
- **Filter system**: Drop shadow, blur, color matrix, and glow filters.
- **Media**: `Sound`, `SoundChannel`, `Video` with audio decode queue.
- **Networking**: HTTP utilities (`URLLoader`, `URLRequest`).
- **Geometry**: `Point`, `Rectangle`, `Matrix` with full Egret-compatible surface.
- **Utilities**: `ByteArray`, `Timer`, `Base64Util`, `Logger`, `toColorString`.
- **External interface**: Bridge for JS ↔ game communication.
- Project initialized as `@blakron/core` (formerly `heron-core`), a modern TypeScript rewrite of the Egret game engine targeting WebGL multi-texture batching and a strict instruction-driven render pipeline.
