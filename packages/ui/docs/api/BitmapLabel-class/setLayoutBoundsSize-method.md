# setLayoutBoundsSize

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
setLayoutBoundsSize(layoutWidth: number, layoutHeight: number): void;
```

Allocate parent-space layout width/height in logical pixels, accounting for
transforms and size constraints. NaN selects the preferred size on that axis;
negative dimensions cause the request to be ignored. Normally called by layouts.
