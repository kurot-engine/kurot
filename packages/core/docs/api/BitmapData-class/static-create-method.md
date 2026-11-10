# static create

Package: `@kurot/core@3.5.1`. Generated from public declarations and JSDoc.

```ts
static create(type: "arraybuffer", data: ArrayBuffer, callback?: (bitmapData: BitmapData) => void): BitmapData;
static create(type: "base64", data: string, callback?: (bitmapData: BitmapData) => void): BitmapData;
```

Starts decoding encoded image bytes or bare base64 through a browser Image.
Returns before loading completes; the callback receives initialized dimensions
after a successful load. Load errors have no callback on this helper.

Related types: [BitmapData](../BitmapData-class.md).
