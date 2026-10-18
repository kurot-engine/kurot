# setLayoutBoundsSize

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
setLayoutBoundsSize(lw: number, lh: number): void;
```

Inherited from `setLayoutBoundsSize`; shown with this receiver's substituted types.

Allocate parent-space layout width/height in logical pixels, accounting for
transforms and size constraints. NaN selects the preferred size on that axis;
negative dimensions cause the request to be ignored. Normally called by layouts.
