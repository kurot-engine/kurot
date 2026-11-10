# startTick

Package: `@kurot/core@3.5.1`. Generated from public declarations and JSDoc.

```ts
startTick(callback: TickCallback): void;
```

Registers a callback receiving absolute milliseconds on the getTimer() clock, not
a delta or seconds. Returning true requests rendering. The callback runs
without a receiver and is deduplicated by function identity. Use an arrow
member or bind once when the callback needs instance state.
Registration does not start scheduling. Continue mode runs callbacks once per
logical frame, including replayed frames; pause mode retains browser tick cadence.

**example**

```ts
import { ticker } from '@kurot/core';

let previous: number | undefined;
const onTick = (now: number): boolean => {
  const deltaSeconds = previous === undefined ? 0 : (now - previous) / 1000;
  previous = now;
  console.log(deltaSeconds);
  return false;
};
ticker.startTick(onTick);
ticker.stopTick(onTick);
```

Related types: [TickCallback](../supporting/core-TickCallback.md).
