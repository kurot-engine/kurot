# setBitmapPixelHitTest

Package: `@kurot/core@3.5.1`. Generated from public declarations and JSDoc.

```ts
setBitmapPixelHitTest(fn: (bitmap: Bitmap, localX: number, localY: number) => boolean): void;
```

Replaces the shared renderer pixel-test hook for all Bitmap instances.
Installing a hook does not enable pixelHitTest on individual bitmaps.
