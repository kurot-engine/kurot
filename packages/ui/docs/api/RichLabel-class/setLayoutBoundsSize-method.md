# setLayoutBoundsSize

Package: `@kurot/ui@5.0.0`. Generated from public declarations and JSDoc.

```ts
setLayoutBoundsSize(layoutWidth: number, layoutHeight: number): void;
```

Allocate parent-space layout width/height in logical pixels, accounting for
transforms and size constraints. NaN selects the preferred size on that axis;
negative dimensions cause the request to be ignored. Normally called by layouts.
