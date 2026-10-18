# Texture

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class Texture
```

BitmapData-backed frame with immutable source-pixel density. Texture sizes
and trim offsets are logical; atlas sampling coordinates stay physical.
Sharing BitmapData does not establish automatic ownership coordination.

**example**

```ts
import { Bitmap, BitmapData, Texture } from '@kurot/core';

const canvas = document.createElement('canvas');
canvas.width = 128;
canvas.height = 128;
const texture = new Texture(2);
texture.setBitmapData(new BitmapData(canvas));
const image = new Bitmap(texture);
console.log(texture.textureWidth); // 64 logical units
image.texture = undefined;
texture.dispose();
```

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Texture-class/constructor-constructor.md) |
| `bitmapData` | public | [open](Texture-class/bitmapData-property.md) |
| `bitmapHeight` | public | [open](Texture-class/bitmapHeight-property.md) |
| `bitmapWidth` | public | [open](Texture-class/bitmapWidth-property.md) |
| `bitmapX` | public | [open](Texture-class/bitmapX-property.md) |
| `bitmapY` | public | [open](Texture-class/bitmapY-property.md) |
| `disposeBitmapData` | public | [open](Texture-class/disposeBitmapData-property.md) |
| `offsetX` | public | [open](Texture-class/offsetX-property.md) |
| `offsetY` | public | [open](Texture-class/offsetY-property.md) |
| `resolution` | public | [open](Texture-class/resolution-property.md) |
| `rotated` | public | [open](Texture-class/rotated-property.md) |
| `sourceHeight` | public | [open](Texture-class/sourceHeight-property.md) |
| `sourceWidth` | public | [open](Texture-class/sourceWidth-property.md) |
| `pixelScale` | public | [open](Texture-class/pixelScale-accessor.md) |
| `scaleBitmapHeight` | public | [open](Texture-class/scaleBitmapHeight-accessor.md) |
| `scaleBitmapWidth` | public | [open](Texture-class/scaleBitmapWidth-accessor.md) |
| `textureHeight` | public | [open](Texture-class/textureHeight-accessor.md) |
| `textureWidth` | public | [open](Texture-class/textureWidth-accessor.md) |
| `dispose` | public | [open](Texture-class/dispose-method.md) |
| `getPixel32` | public | [open](Texture-class/getPixel32-method.md) |
| `getPixels` | public | [open](Texture-class/getPixels-method.md) |
| `initData` | public | [open](Texture-class/initData-method.md) |
| `setBitmapData` | public | [open](Texture-class/setBitmapData-method.md) |
| `toDataURL` | public | [open](Texture-class/toDataURL-method.md) |
