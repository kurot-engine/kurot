# hitTestAlpha

Package: `@kurot/core@3.5.0`. Generated from public declarations and JSDoc.

```ts
hitTestAlpha(x: number, y: number): boolean;
```

Tests the original alpha of a texture's trimmed, upright content.

Coordinates are logical content coordinates, truncated toward zero before
density conversion. Subtract animation frame placement before calling; do
not add or subtract Texture.offsetX/offsetY. Each position samples the source
pixel containing it, without smoothing, display transforms, alpha or filters.
Any nonzero alpha, including 1, hits. Outside content, non-finite coordinates
and missing/encoded-only pixel sources return false.

Uses the same reusable Canvas buffer as Bitmap.pixelHitTest, without retaining
textures or caching pixels. Mutable sources are read on every call. Canvas
drawing/readback errors (including cross-origin SecurityError) propagate;
the buffer is reset even on failure. Caller-owned pixels are never disposed.
Requires a browser Canvas 2D context, independently of the Player backend or
output resolution; no Player initialization is needed.

**example**

```ts
import { BitmapData, Texture } from '@kurot/core';

const canvas = document.createElement('canvas');
canvas.width = canvas.height = 1;
const pixels = canvas.getContext('2d');
if (!pixels) {
    throw new Error('Canvas 2D is required');
}
pixels.fillRect(0, 0, 1, 1);
const texture = new Texture();
texture.setBitmapData(new BitmapData(canvas));
console.log(texture.hitTestAlpha(0, 0)); // true
texture.dispose();
```

**Parameter x:** Horizontal position relative to the trimmed content's left edge.

**Parameter y:** Vertical position relative to the trimmed content's top edge.
