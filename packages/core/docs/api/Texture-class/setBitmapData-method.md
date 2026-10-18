# setBitmapData

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
setBitmapData(value: BitmapData): void;
```

Borrows the given BitmapData as a full-image frame and recomputes dimensions
using this texture's immutable resolution. Does not dispose a previous source;
coordinate ownership before replacing shared image data.

Related types: [BitmapData](../BitmapData-class.md).
