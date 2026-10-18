# setScrollPosition

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
setScrollPosition(top: number, left: number, isOffset: boolean): void;
```

Set top and left scroll positions in logical pixels and dispatch CHANGE,
even if unchanged. Defaults to absolute, clamped coordinates. With isOffset=true, applies
deltas multiplied by scrollSpeed and allows resistance when bounces is true.
Axes disabled by their scroll policy are not advanced.

**Default isOffset:** `false`
