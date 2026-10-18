# localToGlobal

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
localToGlobal(localX: number, localY: number, resultPoint?: Point): Point;
```

Inherited from `Bitmap.localToGlobal`; shown with this receiver's substituted types.

Converts local logical coordinates to logical stage coordinates, including
ancestors, anchors and scrolling. Inputs default to (0, 0); resultPoint is
reused when supplied. The result is not a browser client-pixel position.

**Default localX:** `0`

**Default localY:** `0`

Related types: [Point](../../../../core/docs/api/Point-class.md).
