# setBitmapData

Package: `@kurot/core@3.5.1`. Generated from public declarations and JSDoc.

```ts
setBitmapData(value: BitmapData): void;
```

Assigns BitmapData as a full-image frame and recomputes dimensions using this
texture's immutable resolution. Does not dispose a previous source. Later
dispose() follows disposeBitmapData, which defaults to owning the source.

Related types: [BitmapData](../BitmapData-class.md).
