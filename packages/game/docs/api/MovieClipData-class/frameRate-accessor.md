# frameRate

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
get frameRate(): number;
set frameRate(value: number);
```

Frames-per-second metadata; defaults to 24. Must be finite and positive or
throws RangeError. MovieClip does not schedule frames from this value itself.
