# premultipliedAlpha

Package: `@kurot/core@3.0.0`. Generated from public declarations and JSDoc.

```ts
premultipliedAlpha: boolean;
```

Declares already-premultiplied input pixels, bypassing alpha conversion.
ImageBitmap has no readable alpha metadata: false (the default) normalizes
it through Canvas 2D, true requires premultiplyAlpha:'premultiply' at creation.

**Default/initializer:** `false`
