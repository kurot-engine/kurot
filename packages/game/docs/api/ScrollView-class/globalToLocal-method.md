# globalToLocal

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
globalToLocal(stageX: number, stageY: number, resultPoint?: Point): Point;
```

Inherited from `Sprite.globalToLocal`; shown with this receiver's substituted types.

Converts logical stage coordinates to this object's local coordinates,
including ancestors, anchors and scrolling. Defaults to stage (0, 0).
Writes into resultPoint when supplied; browser client coordinates need conversion first.

**Default stageX:** `0`

**Default stageY:** `0`

Related types: [Point](../../../../core/docs/api/Point-class.md).
