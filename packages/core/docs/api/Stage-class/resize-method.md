# resize

Package: `@kurot/core@3.2.0`. Generated from public declarations and JSDoc.

```ts
resize(width: number, height: number): void;
```

Stores logical viewport dimensions and dispatches Event.RESIZE, even if
the dimensions are unchanged. Used by screen adaptation after layout.
