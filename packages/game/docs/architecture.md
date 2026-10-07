# @kurot/game architecture

> Current version: 2.0.0, with peerDependency `@kurot/core: ^2.0.0`.
> See [CHANGELOG.md](../CHANGELOG.md) for release-by-release changes.
> The [AI context map](./ai-context.md) provides directory, behavior, terminology
> and task-to-file references. This document explains design decisions and internal
> mechanisms for human readers; the two documents complement each other.

---

## 1. Overview

`@kurot/game` is the game extension layer above
[`@kurot/core`](../../core/docs/architecture.md). It provides higher-level features:
chainable property animation (Tween), externally driven frame animation
(MovieClip), inertial scrolling (ScrollView), particle systems and an
Egret-compatible network-loading wrapper (URLLoader).

Core is a `peerDependency`, excluded from the output bundle. Consumers explicitly
install and control its version to avoid multiple Core instances.

Scheduling is delegated to the caller or Core's `ticker` rather than independent
package timers. The specific state and ticker ownership varies by subsystem,
as described in section 3.

---

## 2. Module structure

```text
packages/game/src/kurot/
├── tween/       Chainable property animation
│   ├── Tween.ts        get() factory, step queue, pause/resume/seek, thenable
│   ├── TweenGroup.ts    Named groups with automatic completion/removal tracking
│   ├── Ease.ts          Easing functions: linear/sine/quad/.../elastic/bounce/cubicBezier
│   └── types.ts         TweenOptions, EaseFunction, discriminated step union
├── display/     Frame animation and scrolling
│   ├── MovieClip.ts             Display object with external frame stepping; no ticker
│   ├── MovieClipData.ts          Frame/label/event data with 0-based indices
│   ├── MovieClipDataFactory.ts   Egret mc/res JSON → MovieClipData
│   ├── MovieClipTextureParser.ts Frame texture crop strategy and default Egret parser
│   └── ScrollView.ts             Touch samples, resistance/spring, optional tween scrolling
├── particle/    Particle systems
│   ├── Particle.ts                 x/y/scale/rotation/alpha/lifetime fields
│   ├── GravityParticle.ts          Velocity and radial/tangential acceleration
│   ├── ParticleSystem.ts           Pooling, emission intervals, ticker registration
│   └── GravityParticleSystem.ts    Particle-Designer-style gravity/radial/tangential physics
└── net/         Network loading
    ├── URLLoader.ts          Routes dataFormat to Core HttpRequest/ImageLoader/Sound
    ├── URLRequest.ts          method/url/data/headers
    ├── URLVariables.ts        Query codec using a custom regex, not URLSearchParams
    ├── URLRequestHeader.ts
    ├── URLRequestMethod.ts
    └── URLLoaderDataFormat.ts
```

`src/index.ts` exports the public API in these four groups. See section 4 of
`ai-context.md` for the complete list.

---

## 3. Scheduling and ticker ownership

The subsystems that advance every frame register with Core's `ticker` at
different granularities. Understanding these differences is essential to their
runtime behavior.

### 3.1 Tween: one shared registration

```text
Tween.get(target)
  → _addActive(tween)
    → when _activeTweens.size changes from 0 to 1
      → ticker.startTick(_globalTick, null)   register once

_globalTick(timeStamp)
  → derive deltaTime; the first callback only records the timestamp
  → iterate a shallow copy of _activeTweens (callbacks may add/remove members)
  → call tween._tick(deltaTime) for each tween

Tween completion/removal → _removeActive(tween)
  → when _activeTweens.size becomes 0
    → ticker.stopTick(_globalTick, null)      unregister
```

All Tween instances in the module share one `_globalTick` callback on Core's
ticker. This avoids separate callback registration/removal for every short-lived
tween, such as dozens of simultaneous UI transitions.

### 3.2 ParticleSystem: one registration per instance

```text
particleSystem.start()
  → ticker.startTick(this._update, this)      register each instance

particleSystem.stop(clear = false)
  → stop emission; keep the ticker until existing particles expire
particleSystem.stop(clear = true)
  → clear particles and unregister immediately
```

Particle systems usually number only a few per scene, such as explosions or smoke,
and have different lifetimes and emission intervals. Independent registrations
keep their lifecycle handling simple without a shared active-instance registry.

### 3.3 MovieClip: explicit external stepping

MovieClip neither registers with Core's ticker nor tracks elapsed time itself.
It exposes `advanceFrame()` and lets an external scheduler decide when a logical
frame has elapsed; see the README's `ENTER_FRAME` accumulator example. Multiple
clips can share a frame rate or use different frame rates without storing separate
timing state inside each MovieClip.

Tween shares one global callback, ParticleSystem registers per instance, and
MovieClip relies on explicit caller-driven stepping. Do not generalize one
subsystem's scheduling behavior to the others.

---

## 4. Tween internals

### 4.1 Step queue and discriminated union

Tween maintains an array of `ToStep`, `FromStep`, `WaitStep`, `CallStep` and
`SetStep` entries, defined in `types.ts`. They share a `duration` field;
call/set steps always have duration 0. `_tick()` consumes time in a `do...while`
loop, so a large deltaTime after a stall can advance through multiple steps and
even multiple complete repeat cycles in one frame.

### 4.2 Repeat and yoyo semantics

`repeat` counts additional cycles: `repeat: 0` plays once, and `repeat: -1` loops
forever. With `yoyo: true`, each new cycle changes direction. Reversal remaps
indices with `steps.length - 1 - index`, reversing the entire step sequence.
Instantaneous call/set steps execute only during forward playback and are
explicitly skipped during the reverse pass.

Start/end values for to/from steps are captured lazily once, on first use, and
remain fixed. External target-property changes do not alter the captured values
used in later repeat/yoyo cycles.

### 4.3 Thenable and seeking

Tween implements `then()` and can be awaited directly. Its promise resolves on
both natural completion and explicit `remove()`/`removeTweens()`, and never
rejects. This allows completion to participate in asynchronous orchestration.
`setPosition()` seeks within the sequence by reapplying to/from/set steps while
skipping call steps to avoid replaying arbitrary side effects. It always resets
direction to forward; it cannot seek into a reversed yoyo position.

---

## 5. MovieClip data model

### 5.1 Two indexing conventions

MovieClip's internal frame index is 0-based; public `currentFrame` is 1-based
(`_currentFrameIndex + 1`). Hand-built MovieClipData uses 0-based indices for
`setFrameLabel()` / `setFrameEvent()`. Egret JSON label/event frame numbers are
1-based and are decremented during MovieClipDataFactory conversion.

### 5.2 Egret duration expansion

MovieClipDataFactory expands each Egret keyframe's integer `duration` into that
many runtime frames: a frame with `duration: 3` produces three identical
MovieClipData frames. Egret label/event frame numbers refer to the expanded
logical sequence, rather than raw JSON array indices. Confusing these conventions
causes frame-offset errors.

### 5.3 External scheduling

`MovieClip.advanceFrame()` advances the internal frame pointer and dispatches
`FRAME_CHANGE` / `LOOP_COMPLETE` / `COMPLETE` as needed. It never reads
`frame.duration`; that field is timing metadata for an external accumulator.
`gotoAndPlay(label)` restricts subsequent looping to the label's declared range
until a numeric gotoAndPlay/gotoAndStop clears that range.

---

## 6. ScrollView damping

ScrollView uses separate constants for two stages of out-of-bounds movement:

- During dragging, `RESISTANCE` (0.4) reduces movement beyond the bounds.
- After release, `SPRING` (0.2) eases the content back within bounds during inertia.

Velocity is a weighted average of the latest five touch samples, with more weight
on newer samples, converted from px/ms to px/frame. Programmatic tween scrolling
through `setScrollTop` / `setScrollLeft` with duration shares the same
`ENTER_FRAME` listener as touch inertia. Starting either mode stops the other.

---

## 7. Particle template methods

ParticleSystem owns pooling, emission timing, ticker registration and lifecycle.
Despite its name, `emissionRate` is an interval in milliseconds per particle,
not a particle count per second. Subclasses implement `initParticle()` and
`advanceParticle()` to define their physics.

GravityParticleSystem provides Particle-Designer-style physics. Radial
acceleration follows the direction from the emission origin to the current
position; tangential acceleration is perpendicular to it, rotated by 90°;
constant linear gravity is added. `maxParticles` is required to calculate
`emissionRate = lifespan / maxParticles`. Omitting it leads to division by zero,
which ParticleSystem's constructor rejects with a RangeError.

Particle rendering uses a custom `$renderObjectType` value (6) to extend Core's
RenderObjectType handling without changing Core's enum. That enum alone does
not describe the particle rendering type.

---

## 8. URLLoader backends

URLLoader provides an Egret-style loading entry point and routes requests to
three Core components according to dataFormat:

| dataFormat                 | Backend       | Meaning of `data`                                      |
| -------------------------- | ------------- | ------------------------------------------------------ |
| `TEXTURE`                  | `ImageLoader` | Result wrapped in Texture                              |
| `SOUND`                    | `Sound`       | The Sound instance itself, rather than raw audio bytes |
| `TEXT` / `BINARY` / `JSON` | `HttpRequest` | The result for the selected format                     |

Only the HttpRequest path dispatches `ProgressEvent.PROGRESS`. Texture and Sound
loads do not support progress events. Loading failures, including JSON parse
failures, dispatch `IOErrorEvent.IO_ERROR` rather than escaping as unhandled exceptions.

When `URLRequest.data` is URLVariables, GET appends it to the query string. POST
serializes it as the body and adds `application/x-www-form-urlencoded` when no
Content-Type was explicitly set. Pass a plain string to send a JSON body.

See the root [Egret migration guide](../../../docs/egret-migration.md) for
module differences.

---

## 9. Test coverage

`test/` is organized by subsystem: `Tween.test.ts`, `TweenGroup.test.ts`,
`MovieClip.test.ts`, `MovieClipDataFactory.test.ts`, `ScrollView.test.ts` and
`ParticleSystem.test.ts`. Run `pnpm --dir packages/game test` for current counts.
