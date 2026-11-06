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
- Returning true requests rendering; it does not change the configured frame rate.
- Registering a callback does not start requestAnimationFrame by itself.
- Each update uses a callback snapshot. Adds/removals during dispatch affect
  the next snapshot; a removed callback already in the snapshot can still run.
- pause/resume retain registrations. stop() stops scheduling while retaining
  callbacks and players; owners still release their own registrations.

## Texture capability boundary

Texture has no getPixels or toDataURL methods in this source contract. Its
getPixel32 base method still throws; RenderTexture.getPixel32 implements reads
from an existing Canvas capture. Render-buffer readback and Canvas export are
separate capabilities and retain their implementations.
