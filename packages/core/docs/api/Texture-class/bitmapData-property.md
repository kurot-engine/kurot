# bitmapData

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
bitmapData?: BitmapData;
```

Shared pixel source, initially undefined. Prefer setBitmapData() when
replacing a full image so frame dimensions refresh. Assigning a source does
not dispose the previous one or coordinate shared resource ownership.

Related types: [BitmapData](../BitmapData-class.md).
