# EgretMovieClipTextureParser

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
class EgretMovieClipTextureParser implements MovieClipTextureParser
```

Converts frame metadata emitted by Egret's MovieClip exporter.

Egret frame x/y values are registration-point-relative drawing offsets, not
transparent padding. The cropped bitmap dimensions therefore remain the
frame's drawable dimensions even when either offset is negative.

Related types: [MovieClipTextureParser](MovieClipTextureParser-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](EgretMovieClipTextureParser-class/constructor-constructor.md) |
| `createFrameTexture` | public | [open](EgretMovieClipTextureParser-class/createFrameTexture-method.md) |
