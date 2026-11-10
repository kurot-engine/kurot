# setBitmapData

Package: `@kurot/core@3.5.2`. Generated from public declarations and JSDoc.

```ts
setBitmapData(value: BitmapData): void;
```

Inherited from `setBitmapData`; shown with this receiver's substituted types.

Assigns BitmapData as a full-image frame and recomputes dimensions using this
texture's immutable resolution. Does not dispose a previous source. Later
dispose() follows disposeBitmapData, which defaults to owning the source.

Related types: [BitmapData](../BitmapData-class.md).
