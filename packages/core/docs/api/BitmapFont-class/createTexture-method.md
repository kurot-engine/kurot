# createTexture

Package: `@kurot/core@3.0.0`. Generated from public declarations and JSDoc.

```ts
createTexture(name: string, bitmapX: number, bitmapY: number, bitmapWidth: number, bitmapHeight: number, offsetX: number, offsetY: number, textureWidth?: number, textureHeight?: number): Texture;
```

Inherited from `createTexture`; shown with this receiver's substituted types.

Creates a view using source-pixel coordinates, trim offsets and original
frame dimensions. Logical dimensions inherit the page's resolution.
Omitted original sizes default to trim offset plus sampled size. Reusing a
name replaces its lookup entry without disposing the previous non-owning view.

**Default offsetX:** `0`

**Default offsetY:** `0`

Related types: [Texture](../Texture-class.md).
