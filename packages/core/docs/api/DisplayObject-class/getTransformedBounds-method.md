# getTransformedBounds

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
getTransformedBounds(targetCoordinateSpace: DisplayObject, resultRect?: Rectangle): Rectangle;
```

Returns an axis-aligned logical bounding box in targetCoordinateSpace.
Rotation/skew can enlarge the box. A supplied resultRect is overwritten and
returned; otherwise a new rectangle is allocated.

Related types: [Rectangle](../Rectangle-class.md), [DisplayObject](../DisplayObject-class.md).
