# static fromTextureArray

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
static fromTextureArray(textures: Texture[], fps: number): MovieClipData;
```

Create frame data borrowing the supplied textures. fps defaults to 12 frames
per second; each frame receives duration 1000 / fps milliseconds. Non-positive
or non-finite fps throws RangeError. The caller still owns the textures.

**Default fps:** `12`

Related types: [MovieClipData](../MovieClipData-class.md), [Texture](../../../../core/docs/api/Texture-class.md).
