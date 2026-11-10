# Ticker callback ownership

Available in Core 3.0.0. The installed SDK declarations establish the API for
each release.

## Register and release

```ts
import { ticker } from '@kurot/core';

class RoundClock {
    private _previous?: number;
    private readonly _onTick = (now: number): boolean => {
        const elapsed = this._previous === undefined ? 0 : now - this._previous;
        this._previous = now;
        console.log(elapsed);
        return false;
    };

    public start(): void {
        this._previous = undefined;
        ticker.startTick(this._onTick);
    }

    public dispose(): void {
        ticker.stopTick(this._onTick);
    }
}
```

The ticker stores function references. Registering the same function twice has
one effect; distinct bound functions remain distinct registrations. Retain the
exact function for stopTick. A new bind() call produces a new identity.
Callbacks run without a receiver; arrow functions or functions bound once by
their owner retain instance state. The ticker keeps callbacks alive until their
owner unregisters them. Removing a display node does not unregister a callback.

## Scheduling

- Timestamps are absolute milliseconds from getTimer(), not elapsed deltas.
  The optional continuous mode described below uses logical engine time.
- Returning true requests rendering; it does not change the configured frame rate.
- Registering a callback does not start requestAnimationFrame by itself.
- Each update uses a callback snapshot. Adds/removals during dispatch affect
  the next snapshot; a removed callback already in the snapshot can still run.
- pause/resume retain registrations. stop() stops scheduling while retaining
  callbacks and players; owners still release their own registrations.

## Texture capability boundary

Core 3.0 removes Texture.getPixels and Texture.toDataURL. Core 3.1 also removes
the unsupported base getPixel32 declaration and adds Texture.hitTestAlpha for
original texture alpha. RenderTexture.getPixel32 implements RGBA reads from an
existing Canvas capture. Render-buffer readback and Canvas export are separate
capabilities and retain their implementations. See
[texture alpha testing](texture-density.md#texture-alpha-testing).

## Optional background logic

Available in Core 3.4.0.

`createPlayer({ canvas, backgroundPolicy: 'continue' })` opts one application into
continuous logical time. Omission (or `'pause'`) retains the existing foreground
scheduler and pauses it while hidden. Other applications are unaffected. Select
this option before starting the Player or registering game clocks. Direct hosts
can use `setupLifecycle(stage, { backgroundPolicy: 'continue' })`, or set
`ticker.backgroundPolicy` before `ticker.start()` and supply `setPageHidden()`.
Changing modes while the ticker runs throws.

Continue mode advances `startTick` callbacks and `ENTER_FRAME` once per logical
frame at the configured rate (capped at 60). The callback timestamp and
`getTimer()` share an integer-millisecond logical clock, including outside
callbacks. Tween and Timer already consume this clock; no Game-specific driver
is needed. Authored durations, playback speed and individual Tween pause state
remain the caller's responsibility. Use `Date.now()` for server deadlines or
real-world timestamps; do not mix it with logical elapsed time.

Each logical frame runs tick callbacks, deferred calls/render invalidation, then
`ENTER_FRAME`. Hidden frames perform no Player rendering. Visible presentation
runs once the current debt is drained and uses the latest display tree. Logical
updates may still change display objects, validate layouts and dispatch animation
callbacks; suppressing those would change gameplay. In this mode custom tick
callbacks run at the logical frame rate, not at the browser's refresh rate.

Hidden scheduling requests one wake-up per second and replays elapsed frames.
Browser throttling may delay it further; freezing suspends JavaScript entirely.
On the next delivery, missing frames replay in separate tasks, so promise chains
from one frame settle before the next. A timer yield after 120 replayed frames
or an 8 ms processing window prevents an unbounded synchronous catch-up loop.
Debt is not dropped or converted into one large Tween delta. Large debts can
therefore take time to catch up; `ticker.pendingTime` exposes sampled remaining
milliseconds. No client loop can guarantee timely background notifications while
a browser freezes, discards or terminates the page; those require server/host
support. Reloading a discarded page is outside in-memory catch-up.

`pause()`/`resume()` belong to the application. Visibility has its own state and
never resumes a business pause, in either mode. Continue mode excludes paused
time while retaining debt accumulated before the pause. `stop()` cancels all
owned wake-ups and discards remaining debt; `start()` excludes the stopped
interval. Stopping/destroying the last continuous Player or disposing its
lifecycle cancels the scheduler. Registrations still belong to their owners:
release Timer, Tween, frame and other application subscriptions on destruction.

Native `setTimeout`, Worker messages and network callbacks are not intercepted.
Projects with separate frame/second schedulers must connect those schedulers to
`ENTER_FRAME`, `startTick` or Timer when opting in, and detach the old source to
avoid double delivery. Server push deadlines remain real-world time.

For controlled testing, `update()` consumes at most one due logical frame;
`update(true)` never invents elapsed time in continue mode. A manual driver must
also yield between replayed frames when promise ordering matters.

## Verification

Run `pnpm --dir packages/core test` for scheduling, lifecycle and cancellation
regressions. `pnpm --dir packages/core test:background` exercises Core, Game Tween,
Timer and real Player rendering in Chromium. That browser test injects visibility
and host callback suspension to make delivery deterministic; it does not certify
mobile OS suspension, discarded pages or actual notification delivery.
