# startTick

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
startTick(callback: TickCallback, thisObject: unknown): void;
```

Registers a callback receiving absolute milliseconds from getTimer(), not
a delta or seconds. Returning true requests rendering. The callback and
thisObject pair is deduplicated and must match when calling stopTick().
Registration does not start the requestAnimationFrame loop by itself.

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
ticker.startTick(onTick, undefined);
ticker.stopTick(onTick, undefined);
```

Related types: [TickCallback](../supporting/core-TickCallback.md).
