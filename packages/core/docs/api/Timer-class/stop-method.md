# stop

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
stop(): void;
```

Detaches the timer's ticker callback; repeated stops are harmless.
Preserves currentCount and listeners, and does not emit TIMER_COMPLETE.
Call when the owning game round/view exits.

**example**

```ts
import { Timer, TimerEvent } from '@kurot/core';

const timer = new Timer(1000, 30);
const onSecond = (): void => { console.log(timer.currentCount); };
timer.addEventListener(TimerEvent.TIMER, onSecond);
timer.start();
function disposeRoundTimer(): void {
  timer.stop();
  timer.removeEventListener(TimerEvent.TIMER, onSecond);
}
disposeRoundTimer();
```
