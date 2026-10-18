# texture

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get texture(): Texture | undefined;
set texture(value: Texture | undefined);
```

Texture reference, initially undefined. Assignment does not transfer
resource ownership; assigning undefined clears the image without disposing
the old texture or its shared BitmapData.

Related types: [Texture](../Texture-class.md).
