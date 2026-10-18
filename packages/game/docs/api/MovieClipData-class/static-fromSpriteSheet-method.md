# static fromSpriteSheet

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
static fromSpriteSheet(sheet: { getTexture: any }, frameNames: string[], fps: number): MovieClipData;
```

Create frame data from named borrowed atlas textures. fps defaults to 12 frames
per second and must be finite and positive, or throws RangeError. Missing
textures become blank frames; this does not load assets or dispose the sheet.

**Default fps:** `12`

Related types: [MovieClipData](../MovieClipData-class.md).
