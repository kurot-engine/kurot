# getLayout

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
getLayout(): BitmapTextLayout;
```

Returns the cached layout for current text/font/constraints, or an empty
layout without a font. Treat returned layout data as read-only; it is shared
with rendering until a property invalidates the cache.

Related types: [BitmapTextLayout](../supporting/bitmap-font-BitmapTextLayout.md).
