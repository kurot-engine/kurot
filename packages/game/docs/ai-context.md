# @kurot/game — AI context map

Read this before exploring `src/`. It is a compressed map so an agent
unfamiliar with Kurot does not need to re-derive the architecture from
scratch each session. It describes the current source and public exports;
internal plans and reviews are not required context.

Package identity: `@kurot/game@1.0.6`. Peer-depends on `@kurot/core`.

Source root: `src/kurot/`. Public API: `src/index.ts` groups exports into
tween / display / particle / net — see §4.

## 1. Directory map

```
src/kurot/
├── tween/      Tween, TweenGroup, Ease. Chainable property animation with a
│               step queue, repeat/yoyo, pause/resume, and Promise completion.
├── display/    MovieClip, MovieClipData, MovieClipDataFactory (sprite-sheet JSON
│               importer), MovieClipTextureParser, ScrollView. Sequence-frame
│               animation (externally driven) and inertial scroll container.
├── particle/   Particle, GravityParticle, ParticleSystem, GravityParticleSystem.
│               Pooled particle emission, template-method physics extension.
└── net/        URLLoader, URLRequest, URLVariables, URLRequestHeader/Method,
                URLLoaderDataFormat. Convenience wrapper over core's
                HttpRequest/ImageLoader/Sound.
```

## 2. Non-obvious behavior

### Tween

- **All tweens share ONE ticker registration**, not one per instance.
  `Tween.get()` registers with core's `ticker.startTick()` only when the
  first active tween appears (`_activeTweens.size === 0 → 1`), and
  unregisters when the last one is removed. `ParticleSystem` independently
  registers each system instance.
- The first tick after registration is a no-op that only captures
  `_lastTimeStamp` — a newly created tween effectively starts advancing on
  the _second_ ticker callback, not the first.
- `_globalTick` iterates a **shallow-copied snapshot** of `_activeTweens`
  each frame specifically so tween callbacks (`call()`, `onLoopComplete`) can
  safely add/remove tweens mid-iteration without corrupting the live Set.
- **yoyo reverses the entire step list**, not just property interpolation —
  reversed playback remaps step indices via `steps.length - 1 - index`.
  `call()` and `set()` steps are explicitly skipped during the reverse pass
  (only run forward) — this is why the README says "call/set run only during
  the forward pass," but the mechanism is a full index remap, not a
  per-step reverse flag.
- Captured start/end values for `to()`/`from()` steps are captured **once,
  lazily, on first use**, and never refreshed. If the target's property is
  mutated externally mid-tween, later yoyo/repeat cycles still animate
  to/from the originally captured value, not the live one.
- `loop: true` is normalized to `repeat: -1` only when `repeat` is omitted —
  if both are given, `repeat` wins.
- `setPosition()`/seeking rebuilds state from the start of the
  forward-only sequence and **deliberately skips `call()` steps** (to avoid
  replaying arbitrary side effects) and always resets `_reversed = false` —
  you cannot seek into a yoyo-reversed position.
- A single large `deltaTime` (e.g. after a stall) can consume multiple steps
  and multiple full repeat cycles in one tick (`_tick()` uses a `do...while`
  loop). For non-timed infinite loops (only `call()`/`set()` steps with
  `repeat: -1`), the loop deliberately breaks after one cycle per tick to
  avoid hanging synchronously.
- `Tween` is thenable (hand-rolled `then()`); the promise resolves on BOTH
  natural completion AND explicit `remove()`/`removeTweens()` — it never
  rejects.
- `Ease` functions **do not clamp input** — allows overshoot curves
  (`backOut`, `elasticOut`), but passing progress outside `[0,1]` yields
  unclamped extrapolated results.
- `TweenGroup` self-prunes: each tracked tween gets a release listener that
  removes it from the group automatically on completion/removal — the group
  never needs to poll.

### MovieClip / MovieClipData / MovieClipDataFactory

- **Internal frame index is 0-based; public `currentFrame` is 1-based**
  (`currentFrame` returns `_currentFrameIndex + 1`). Hand-built
  `MovieClipData.setFrameLabel()`/`setFrameEvent()` calls take 0-based
  indices — but Egret JSON label/event frame numbers are 1-based and get
  `-1`'d during conversion in `MovieClipDataFactory`. Two different indexing
  conventions coexist depending on which API you're using.
- `MovieClipDataFactory` expands each Egret key-frame's integer `duration`
  into that many repeated runtime frames (one JSON frame with `duration: 3`
  becomes 3 identical `MovieClipData` frames). Label/event frame numbers in
  the Egret schema refer to these **post-expansion logical frames**, not raw
  JSON array indices — a common source of off-by-N label errors if you
  assume 1 JSON frame = 1 runtime frame.
- `gotoAndPlay(label)` scopes subsequent looping to that label's declared
  range until a numeric `gotoAndPlay`/`gotoAndStop` clears the range — a
  "sub-animation" concept not obvious from the method name alone.
- `play(0)` (the default) "keeps the current setting" per the README, but
  concretely: `_playTimes` is only overwritten if the argument isn't `0`.
  Calling bare `play()` while stopped resumes with whatever `_playTimes` was
  last set to — which defaults to `1` if never explicitly set, not infinite.
- `advanceFrame()` on an already-stopped/completed clip is a silent no-op
  (guarded by `_isPlaying`), not an error.
- `LOOP_COMPLETE` fires **before** the frame index resets, and the code
  re-checks playing state immediately after dispatch — a `LOOP_COMPLETE`
  listener can call `stop()` or swap `movieClipData` synchronously and the
  clip respects that instead of blindly resetting to frame 0.
- Setting `movieClipData` always stops playback and resets to frame 0 —
  swapping data mid-playback is never seamless; call `play()` again after.
- `MovieClipDataFactory` caching is keyed by clip name and **on by default**
  (`enableCache = true`) — repeated calls return the _same_ `MovieClipData`
  instance. Mutating it (e.g. adding frame events at runtime) affects every
  MovieClip sharing that generated data.
- `frameDuration`/`duration` metadata on frames is purely advisory —
  `MovieClip.advanceFrame()` never reads it. It exists solely for an
  external scheduler's own accumulator math (see the README's scheduler
  example).
- Egret frame `x`/`y` are registration-offsets, not crop padding — the
  cropped bitmap size stays the same as the atlas region even for negative
  offsets; offsets only shift the registration point.

### ScrollView (undocumented in README)

- Physics constants are hardcoded module-level constants, not configurable
  per-instance: `SAMPLE_COUNT=5`, `FRICTION=0.95`, `SPRING=0.2`,
  `STOP_THRESHOLD=0.5`, `RESISTANCE=0.4`, `FRAME_MS=16.67`.
- Velocity is a weighted average over up to 5 recent touch-move samples
  (later samples weighted more), converted px/ms → px/frame.
- **Two different damping constants for what looks like one bounce
  behavior**: active-drag-past-bounds uses "resistance" (0.4), released
  inertia bounce-back uses "spring" (0.2) easing.
- Supports tweened programmatic scrolling (`setScrollTop`/`setScrollLeft`
  with `duration`) that reuses the _same_ `ENTER_FRAME` listener as touch
  inertia — touch-driven inertia and tween-scroll are mutually exclusive by
  design (starting one stops the other).
- Scroll bounds recompute lazily on demand (getters, `setContent`, resize)
  rather than being cached/invalidated on a dirty flag — resizing content
  externally without going through ScrollView's own methods can leave bounds
  stale until the next getter/touch call.
- The `dt = now - this._touchLastTime || 1` expression uses `1` when the
  elapsed time is zero; operator precedence makes it equivalent to
  `(now - this._touchLastTime) || 1`.

### Particle / GravityParticle system

- **`ParticleSystem` registers with the ticker per-instance**
  (`ticker.startTick(this._update, this)`). Tween uses one shared registration.
- `stop(false)` (the default) stops new emission but does **not**
  unregister the ticker or clear existing particles — the ticker keeps
  running until existing particles naturally expire and count hits 0. Only
  `stop(true)` clears particles and unregisters immediately.
- `emissionRate` is actually an **interval in ms per particle**, not a
  per-second rate, despite the name — smaller `emissionRate` spawns faster.
  `GravityParticleSystem` derives it automatically as
  `lifespan / maxParticles` in its constructor.
- Particle rendering uses a custom `$renderObjectType` value (`6`) that
  extends core's `RenderObjectType` enum without modifying core itself — you
  will not find particle rendering documented by reading core's enum alone.
- Bounds measurement walks every live particle and unions transformed rects
  every frame — a real per-frame cost at high particle counts. It caches the
  last computed rect so bounds still report correctly for one frame after
  particle count drops to 0.
- **Config gotcha**: `GravityParticleSystem` computes `emissionRate =
lifespan / maxParticles` in its constructor, after `parseConfig()` sets
  `maxParticles`. A config missing `maxParticles` (defaulting to 0) causes a
  division by zero — `ParticleSystem`'s constructor validates that
  `emissionRate` must be finite/non-negative and **throws a `RangeError` at
  construction time** if not. `maxParticles` is a required config field in
  practice, even though nothing in the type system enforces it.
- `GravityParticle.reset()` resets `rotationDelta`/`scaleDelta` but not
  `alphaDelta` — a minor asymmetry, likely harmless since `initParticle`
  always reassigns `alphaDelta` before use, but worth knowing if debugging
  alpha behavior on particle reuse.

### net (URLLoader / URLRequest / URLVariables)

- `URLLoader.load()` dispatches to a **different core loader entirely**
  depending on `dataFormat`: `TEXTURE` → `ImageLoader` (wraps result in a
  `Texture`), `SOUND` → `Sound` (the loaded `data` IS the `Sound` instance,
  not raw audio bytes), everything else (`TEXT`/`BINARY`/`JSON`) →
  `HttpRequest`. Switching `dataFormat` and calling `load()` again works
  because `load()` always calls `close()` first.
- `URLVariables` on `URLRequest.data` behaves differently for GET vs POST:
  GET appends it to the query string (never sent as a body); POST serializes
  it as the body with an auto-added
  `Content-Type: application/x-www-form-urlencoded` header, **only if no
  Content-Type header is already set**. A caller wanting a JSON POST body
  must pass a plain string, not a `URLVariables` instance.
- Progress events (`ProgressEvent.PROGRESS`) only fire for the XHR path —
  `TEXTURE` and `SOUND` loads never dispatch progress.
- JSON parse failures dispatch `IOErrorEvent.IO_ERROR` rather than throwing
  — the async error contract is always event-based, never an unhandled
  exception.
- `URLVariables.decode()` uses a custom regex parser and collapses repeated
  query keys into an array value.
- `close()` fully cleans up all three loader paths (xhr/imageLoader/sound):
  removes listeners, aborts, and dereferences. Still don't rely on
  inspecting internal fields as an "is it done" check; use the
  `Event.COMPLETE`/`IOErrorEvent.IO_ERROR` events instead.

## 3. Cross-cutting pattern worth remembering

`Tween` uses ONE shared module-level ticker registration for all instances.
`ParticleSystem` uses ONE ticker registration PER instance. Don't generalize
ticker-registration behavior from one subsystem to the other.

## 4. Public API surface (`src/index.ts`)

- **Tween**: `Tween`, `TweenGroup`, `Ease`, types `TweenOptions`, `EaseFunction`.
- **Display**: `MovieClip`, `MovieClipData`, `MovieClipDataFactory`, `EgretMovieClipTextureParser`, `MovieClipEvent` (plain const object, not a class), `ScrollView`, `ScrollPolicy`, plus types `EgretMovieClipData`/`EgretMovieClipDataSet`/`EgretMovieClipEventData`/`EgretMovieClipFrameData`/`EgretMovieClipLabelData`/`EgretMovieClipResourceData`, `MovieClipFrame`, `MovieClipEventType`, `MovieClipLabel`, `MovieClipTextureParser`, `MovieClipTextureSource`.
- **Particle**: `Particle`, `GravityParticle`, `ParticleSystem`, `GravityParticleSystem`.
- **Net**: `URLLoader`, `URLRequest`, `URLLoaderDataFormat`, `URLRequestHeader`, `URLRequestMethod`, `URLVariables`.

## 5. Task → file map

| I want to...                             | Look at                                                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a new easing function                | `tween/Ease.ts`                                                                                                                                                |
| Debug why a tween isn't animating        | Check `Tween.ts` `_globalTick`/`_registerTicker` — confirm the tween is in `_activeTweens`                                                                     |
| Import a MovieClip sprite-sheet export   | `display/MovieClipDataFactory.ts`, remember the duration-expansion + 1-based label indexing                                                                    |
| Change scroll physics                    | `display/ScrollView.ts` — check both `_applyResistance` (drag) and the spring correction in `_handleEnterFrame` (release)                                      |
| Add a new particle physics model         | `particle/ParticleSystem.ts` (template base), model on `particle/GravityParticleSystem.ts`'s `initParticle`/`advanceParticle` override pattern                 |
| Debug a stuck/never-completing URLLoader | Check which core loader `dataFormat` routes to (`URLLoader.ts`), verify listeners are on `Event.COMPLETE`/`IOErrorEvent.IO_ERROR`, not polling internal fields |
