# drawToTexture

Package: `@kurot/core@3.2.0`. Generated from public declarations and JSDoc.

```ts
drawToTexture(displayObject: DisplayObject, clipBounds?: Rectangle, scale: number): boolean;
```

Captures the subtree using an optional local logical clip rectangle and a
raster scale, defaulting to 1. Without a clip, the capture retains the local
origin rather than tightly cropping to the content's top-left corner.
Returns false for empty bounds or a missing renderer, preserving an earlier
capture. A successful capture replaces bitmapData without disposing the old
source; coordinate any retained references before capturing again.

**Default scale:** `1`

Related types: [DisplayObject](../DisplayObject-class.md), [Rectangle](../Rectangle-class.md).
