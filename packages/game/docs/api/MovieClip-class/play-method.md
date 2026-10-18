# play

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
play(playTimes: number): void;
```

Start or resume at the current frame. Does nothing if already playing or
there are no frames. No updates are scheduled: the game calls advanceFrame().

**throws**

RangeError If playTimes is not an integer of at least -1.

**Parameter playTimes:** Total plays: -1 forever; 0 (default) preserves the previous
setting, initially 1; positive integers set a new count.

**Default playTimes:** `0`
