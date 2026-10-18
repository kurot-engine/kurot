# gotoAndPlay

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
gotoAndPlay(frame: string | number, playTimes: number): void;
```

Jump to a frame/label and start a new session. Numeric frames use 1-based
indices, clamped to the available range. Labels play their inclusive range;
numeric navigation clears that range. With no frames, stops and returns.

**throws**

RangeError For invalid playTimes, or, when data exists, an unknown
label or non-integer frame number.

**Parameter frame:** Integer frame number or existing label.

**Parameter playTimes:** Total plays: -1 forever, 0 (default) preserves the previous
setting (initially 1), or a positive integer.

**Default playTimes:** `0`
