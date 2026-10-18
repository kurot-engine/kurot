# updateRenderable

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
updateRenderable(renderable: T): void;
```

Update GPU-side data for `renderable` without rebuilding the instruction.
Called during the update phase when only data changed (not structure).
