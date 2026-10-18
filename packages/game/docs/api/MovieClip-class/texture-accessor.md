# texture

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
get texture(): Texture | undefined;
set texture(value: Texture | undefined);
```

Inherited from `Bitmap.texture`; shown with this receiver's substituted types.

Texture reference, initially undefined. Assignment does not transfer
resource ownership; assigning undefined clears the image without disposing
the old texture or its shared BitmapData.

Related types: [Texture](../../../../core/docs/api/Texture-class.md).
