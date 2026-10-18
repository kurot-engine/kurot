# gotoAndStop

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
gotoAndStop(frame: string | number): void;
```

Jump to a 1-based frame/label and stop, clearing any label playback range.
Integer indices clamp to the available range. With no frames, returns unchanged.

**throws**

RangeError For an unknown label or non-integer number when data exists.
