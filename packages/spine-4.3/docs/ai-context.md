# @kurot/spine-4.3 — AI context map

Read this before exploring `src/`. It is a compressed map so an agent
unfamiliar with Kurot does not need to re-derive the architecture from
scratch each session. `internal/plan.md` (Chinese, gitignored/local-only) is
an internal dev-status log that documents the same key design decisions
covered here, plus a "shelved" (搁置) list: WebGL texture filter/wrap
support (no-op under Canvas 2D),
premultiplied-alpha support, debug mesh rendering, and unit tests for
`EventEmitter`/`Track` are all deferred, not implemented.

Package identity: `@kurot/spine-4.3@0.2.3`. Ports the `egret-spine` adapter
to `@kurot/core`, replacing Egret's `Mesh`/`Texture`/`RES` with Kurot
equivalents. The actual Spine runtime (skeleton data, animation state
machine, math) comes from the official `@esotericsoftware/spine-core` npm
package — this package is an **adapter/bridge layer only**, it does not
reimplement Spine.

Source root: `src/kurot/` (only 7 files, flat — no subfolders).
`src/index.ts` re-exports both the 6 Kurot adapter symbols AND commonly
needed raw `@esotericsoftware/spine-core` symbols (`Skeleton`,
`SkeletonData`, `SkeletonJson`, `SkeletonBinary`, `AnimationState`,
`AnimationStateData`, `TextureAtlas`, `AtlasAttachmentLoader`,
`AssetManagerBase`, `Texture`, `TextureFilter`, `TextureWrap`, `MathUtils`,
`Color`) — consumers don't need a separate spine-core import for basic use.

## 1. File map

```
src/kurot/
├── EventEmitter.ts        Minimal generic pub/sub (on/once/off/emit).
│                           Kurot-specific — NOT a Spine-runtime requirement.
│                           Exists purely to give Track ergonomic Promise APIs.
├── Track.ts                Per-track animation queue + Promise waitXxx() API.
│                           Bridges Spine's native AnimationStateListener into
│                           EventEmitter events (see §2).
├── KurotAssetManager.ts    extends spine-core's AssetManagerBase. Replaces
│                           Egret's RES loader with Kurot's HttpRequest/ImageLoader.
├── KurotTexture.ts          extends spine-core's Texture. Wraps a Kurot
│                           BitmapData so Spine attachments can reference it.
├── SlotRenderer.ts          extends Kurot's Mesh. One per Spine Slot — the
│                           actual attachment-geometry-to-Mesh bridge (see §3).
├── SkeletonRenderer.ts      extends Sprite. Container/driver: owns the live
│                           Skeleton/AnimationState, one SlotRenderer per slot,
│                           a shared SkeletonClipping, drives per-frame update().
└── SkeletonAnimation.ts     extends Sprite. Public entry point (README's
                            documented API). Wraps SkeletonRenderer as its
                            child, drives ticking via ENTER_FRAME (see §4).
```

## 2. Track — Promise API is NOT directly Spine-native

`Track.waitXxx()` methods (`waitPlayStart`, `waitPlayEnd`, `waitLoopStart`,
`waitLoopEnd`, `waitInterrupt`, `waitTrackEnd`, `waitEvent`,
`waitNamedEvent`) are `new Promise(resolve => this.once(SpineEvent.X,
resolve))` wrappers around `Track`'s own `EventEmitter` — they are **not**
directly backed by Spine's native `AnimationStateListener`, though they are
_derived from_ it.

The actual bridge happens once, in the constructor: `Track` builds a plain
listener object (`{ complete, interrupt, event, start: undefined, end:
undefined, dispose: undefined }`) matching Spine's native
`AnimationStateListener` shape, and assigns it to `trackEntry.listener`
inside `_setAnimation()` — attached directly to the `TrackEntry`, not
registered globally on `AnimationState`.

- Native `complete` (fires on non-looping end / loop wrap) → emits
  `SpineEvent.LoopEnd`, then either replays (`LoopStart`) or advances the
  internal JS-side queue (`PlayEnd`, then next animation's `PlayStart`/
  `LoopStart`, or `TrackEnd` if queue exhausted).
- Native `interrupt` → clears the queue, emits `Interrupt`.
- Native `event` (Spine frame events) → emits `SpineEvent.Custom`.

**Gotcha**: `TrackEntry.listener` and a few other runtime-public-but-
typed-private members are accessed via `Record<string, unknown>` casts
(`this.trackEntry as Record<string, unknown>`) — a recurring project
convention for bridging gaps between spine-core's `.d.ts` (which marks some
members `private`) and their actual runtime accessibility. The same pattern
appears in `KurotAssetManager` (see §5). `setToLastFrame()` uses the same
raw-cast approach to mutate `animationStart`/`animationLast`/`animationEnd`
directly.

Only one animation plays at a time per `Track`; `add()` on an already-
playing track appends to Track's own JS-side queue (no `AnimationState.
addAnimation` native queuing is used) — `_onComplete` drains it by calling
`state.setAnimation(trackID, name, false)` repeatedly. After interrupt or
track-end, `_disposed` becomes `true` and further `add()` calls silently
no-op.

## 3. SlotRenderer — the attachment-to-Mesh bridge

One `SlotRenderer` (`extends Mesh`) per Spine `Slot`, instantiated by
`SkeletonRenderer`. `renderSlot()`, called every frame:

1. Reads `slot.appliedPose.attachment` (4.3's Pose-based model). No
   attachment or inactive bone → `clipper.clipEnd(slot)` + `visible = false`,
   early return. Attachment type is re-checked via `instanceof` every frame
   — no caching.
2. `ClippingAttachment` → begins a clip region via `clipper.clipStart`,
   returns without touching geometry (clip regions are invisible).
3. `RegionAttachment` → computes 4 world vertices into a reusable
   `Float32Array` (lazily grown), builds a hardcoded quad
   (`QUAD_INDICES = [0,1,2,2,3,0]`), UVs from `attachment.sequence.getUVs()`.
4. `MeshAttachment` → same idea but with the attachment's own
   `worldVerticesLength`/`triangles` (real arbitrary-topology mesh).
5. If clipping is active, both paths route through
   `clipper.clipTrianglesUnpacked()` then copy the clipped
   vertices/UVs/triangles; otherwise vertices/uvs/indices are copied
   directly.
6. **Non-obvious**: `this.vertices`/`this.uvs`/`this.indices` (Kurot Mesh's
   plain public `number[]` fields) are **replaced wholesale every frame**,
   then `this.updateVertices()` is called to mark render-dirty. This is a
   deliberate departure from the old egret-spine adapter, which wrote into
   an internal/private render node (`mesh.$renderNode.vertices`) —
   documented in `internal/plan.md` as an intentional design decision to use
   only Kurot's public Mesh API.
7. Texture is only reassigned if the underlying `BitmapData` actually
   differs (`this.texture.bitmapData !== bd`) — avoids unnecessary
   texture/GPU state churn when the same atlas page is reused frame to
   frame. The `smoothing` flag is copied over from `KurotTexture` at the
   same time.
8. Color: multiplies skeleton color × slot's applied-pose color × attachment
   color (Spine's standard tinting chain), packs the RGB into Kurot's
   `tint` and the combined alpha into `alpha`.
9. Slot's `blendMode` is set to `BlendMode.ADD` only if Spine's slot blend
   mode is `Additive` — normal/multiply/screen fall through to Kurot's
   default (multiply/screen are not specially mapped).

## 4. SkeletonRenderer — the Y-axis flip and draw-order handling

**Y-axis handling (the biggest "surprising interaction" in this package)**:
the constructor sets `this.scaleY = -1` unconditionally, because Spine's
skeleton space is Y-up while Kurot's is Y-down/screen-like. This single flip
on the container reconciles the two coordinate systems — every child
`SlotRenderer` renders in Spine's native Y-up local space and gets flipped
for free by the parent transform.

This is also why `SkeletonAnimation.flipY` looks backwards at first glance:

```
get flipY() { return this.renderer.scaleY === 1 }
set flipY(v) { this.renderer.scaleY = v ? 1 : -1 }
```

`flipY = true` actually means **restoring** `scaleY` to `+1` (undoing the
default `-1`), not applying an _additional_ flip on top of an already-normal
axis. Reading `flipY` in isolation without knowing about the renderer's
baseline `-1` will be misread as backwards.

**Draw order**: `sortableChildren = true` is set because Spine's draw order
can change every frame via draw-order timelines. `update()` re-assigns
`renderer.zIndex = i` for each slot renderer based on
`skeleton.drawOrder.appliedPose`, relying on Kurot's z-index child-sort
rather than physically reordering `children[]`.

**Per-frame `update(dt)`**: `state.update(dt/1000)` (seconds) →
`state.apply(this.skeleton)` → `skeleton.updateWorldTransform(Physics.update)`
(4.3 API, includes physics constraints) → iterate
`skeleton.drawOrder.appliedPose` to set z-index and call
`renderer.renderSlot()` per slot → `this.clipper.clipEnd()` (global
end-of-frame reset, distinct from the per-slot `clipper.clipEnd(slot)` calls
inside `renderSlot()`). The constructor also does one upfront
`updateWorldTransform` + `setupPoseSlots()` + one `renderSlot()` per slot so
the skeleton shows its setup pose immediately, before any animation plays.

## 5. Ticking — no ticker registration, no custom RenderObjectType

**This package does not register with `@kurot/core`'s ticker/scheduler
directly, and does not use a custom `RenderObjectType`** the way
`ParticleSystem` (in `@kurot/game`) does. Instead:

- `SkeletonAnimation` overrides `$onAddToStage`/`$onRemoveFromStage` to
  add/remove a standard `Event.ENTER_FRAME` listener
  (`this.addEventListener(Event.ENTER_FRAME, this._handleEnterFrame)`) —
  the exact same mechanism any Kurot `DisplayObject` uses. Core's
  `DisplayObject.addEventListener` special-cases `ENTER_FRAME`/`RENDER` to
  push `this` onto a static `DisplayObject.$enterFrameCallBackList`, which
  `SystemTicker` iterates every RAF tick and dispatches to.
- `_handleEnterFrame` computes `dt` from `Date.now()` deltas and calls
  `this.renderer.update(dt)`.
- This means animation ticking is **opt-in per instance** — a
  `SkeletonAnimation` only advances while it's actually on stage, not via
  any global spine-specific system.
- `SlotRenderer` (via its `Mesh` base class) does set
  `$renderObjectType = RenderObjectType.MESH`, but that only tells Kurot's
  `MeshPipe` how to _draw_ the object each render pass — it's unrelated to
  animation time advancement, which is entirely the `ENTER_FRAME` mechanism
  above. Don't confuse the two.

## 6. KurotAssetManager / KurotTexture adapter details

- `KurotAssetManager extends AssetManagerBase` (spine-core). Overrides
  `loadTexture`/`loadText`/`loadJson`/`loadBinary`/`loadTextureAtlas` to use
  Kurot's `HttpRequest` (text/JSON/ArrayBuffer) and `ImageLoader` (images →
  `BitmapData` → `KurotTexture`).
- **`.d.ts`-private-but-runtime-public bridging**: `AssetManagerBase`'s type
  declarations mark `start`/`success`/`error`/`toLoad`/`loaded`/`errors`/
  `cache` as `private`, but they're accessible at runtime. Rather than
  scattering casts, the file defines a local `AssetManagerRuntime` interface
  and a single `_rt` getter (`this as unknown as AssetManagerRuntime`) used
  everywhere.
- `loadTextureAtlas`/`loadJson` **deliberately don't delegate through
  `loadText`** — each manages its own `start`/`success` counter pair
  directly, because double-delegating would double-count `toLoad`/`loaded`
  and make `isLoadingComplete()` never return true (documented in
  `internal/plan.md`).
- `loadTextureAtlas` computes the page-image directory prefix from the
  **original** `path` argument, before `pathPrefix` is applied — so page
  texture paths resolve relative to the atlas file, not double-prefixed.
- `KurotTexture extends Texture` (spine-core's abstract, renderer-agnostic
  texture class — it's just a data holder + filter/wrap hints, no GPU work).
  Wraps a Kurot `BitmapData`; `getImage()` returns `bitmapData.source`.
    - `setFilters()` is **not a no-op**: converts Spine's `TextureFilter` enum
      into a boolean `smoothing` flag (true unless both min/mag are
      `Nearest`/`MipMapNearestNearest`), read later by `SlotRenderer.
_applyTexture()`.
    - `setWraps()` **is a no-op** — Canvas 2D doesn't need wrap modes; WebGL
      wrap-hint support is explicitly deferred (see `internal/plan.md`).
    - Note the two-`Texture`-class naming collision: spine-core's `Texture`
      (subclassed by `KurotTexture`) vs. `@kurot/core`'s `Texture` (the actual
      render texture used inside `SlotRenderer`) are different classes,
      bridged via `KurotTexture.bitmapData`.

## 7. Task → file map

| I want to...                                                     | Look at                                                                                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Debug wrong skeleton orientation                                 | `SkeletonRenderer.ts`'s `scaleY = -1` baseline, `SkeletonAnimation.flipY` getter/setter                        |
| Debug missing/wrong texture on an attachment                     | `SlotRenderer._applyTexture()`, `KurotTexture.ts`, `KurotAssetManager.loadTextureAtlas`                        |
| Debug animation queue/track sequencing                           | `Track.ts` — `_setAnimation`, `_onComplete`, the internal JS-side queue                                        |
| Debug clipping artifacts                                         | `SlotRenderer.renderSlot()` — clip start/end calls, `clipper.clipTrianglesUnpacked`                            |
| Add support for a new spine-core version's API shape             | Check `AssetManagerRuntime`/raw-cast bridging pattern first — spine-core's `.d.ts` may not match runtime shape |
| Understand why animation stops when object is removed from stage | `SkeletonAnimation`'s `$onAddToStage`/`$onRemoveFromStage` ENTER_FRAME hook                                    |
