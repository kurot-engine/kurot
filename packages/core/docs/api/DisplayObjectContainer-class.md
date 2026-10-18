# DisplayObjectContainer

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class DisplayObjectContainer extends DisplayObject
```

Owns an ordered list of display children and propagates stage events.
Reparenting moves a child from its previous parent; removal does not imply
resource disposal. WebGL render groups affect batching, not Canvas pixels.

Related types: [DisplayObject](DisplayObject-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](DisplayObjectContainer-class/constructor-constructor.md) |
| `isRenderGroup` | public | [open](DisplayObjectContainer-class/isRenderGroup-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](DisplayObjectContainer-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](DisplayObjectContainer-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](DisplayObjectContainer-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](DisplayObjectContainer-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](DisplayObjectContainer-class/blendMode-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](DisplayObjectContainer-class/cacheAsBitmap-accessor.md) |
| `filters` | public, inherited | [open](DisplayObjectContainer-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](DisplayObjectContainer-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](DisplayObjectContainer-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](DisplayObjectContainer-class/graphics-accessor.md) |
| `height` | public, inherited | [open](DisplayObjectContainer-class/height-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](DisplayObjectContainer-class/isCachedAsTexture-accessor.md) |
| `mask` | public, inherited | [open](DisplayObjectContainer-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](DisplayObjectContainer-class/matrix-accessor.md) |
| `measuredHeight` | public, inherited | [open](DisplayObjectContainer-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](DisplayObjectContainer-class/measuredWidth-accessor.md) |
| `name` | public, inherited | [open](DisplayObjectContainer-class/name-accessor.md) |
| `numChildren` | public | [open](DisplayObjectContainer-class/numChildren-accessor.md) |
| `parent` | public, inherited | [open](DisplayObjectContainer-class/parent-accessor.md) |
| `rotation` | public, inherited | [open](DisplayObjectContainer-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](DisplayObjectContainer-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](DisplayObjectContainer-class/scaleY-accessor.md) |
| `scrollRect` | public, inherited | [open](DisplayObjectContainer-class/scrollRect-accessor.md) |
| `skewX` | public, inherited | [open](DisplayObjectContainer-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](DisplayObjectContainer-class/skewY-accessor.md) |
| `sortableChildren` | public, inherited | [open](DisplayObjectContainer-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](DisplayObjectContainer-class/stage-accessor.md) |
| `tint` | public, inherited | [open](DisplayObjectContainer-class/tint-accessor.md) |
| `touchChildren` | public | [open](DisplayObjectContainer-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](DisplayObjectContainer-class/touchEnabled-accessor.md) |
| `visible` | public, inherited | [open](DisplayObjectContainer-class/visible-accessor.md) |
| `width` | public, inherited | [open](DisplayObjectContainer-class/width-accessor.md) |
| `x` | public, inherited | [open](DisplayObjectContainer-class/x-accessor.md) |
| `y` | public, inherited | [open](DisplayObjectContainer-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](DisplayObjectContainer-class/zIndex-accessor.md) |
| `addChild` | public | [open](DisplayObjectContainer-class/addChild-method.md) |
| `addChildAt` | public | [open](DisplayObjectContainer-class/addChildAt-method.md) |
| `addEventListener` | public, inherited | [open](DisplayObjectContainer-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](DisplayObjectContainer-class/cacheAsTexture-method.md) |
| `childAdded` | public | [open](DisplayObjectContainer-class/childAdded-method.md) |
| `childRemoved` | public | [open](DisplayObjectContainer-class/childRemoved-method.md) |
| `contains` | public | [open](DisplayObjectContainer-class/contains-method.md) |
| `dispatchEvent` | public, inherited | [open](DisplayObjectContainer-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](DisplayObjectContainer-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](DisplayObjectContainer-class/getBounds-method.md) |
| `getChildAt` | public | [open](DisplayObjectContainer-class/getChildAt-method.md) |
| `getChildByName` | public | [open](DisplayObjectContainer-class/getChildByName-method.md) |
| `getChildIndex` | public | [open](DisplayObjectContainer-class/getChildIndex-method.md) |
| `getTransformedBounds` | public, inherited | [open](DisplayObjectContainer-class/getTransformedBounds-method.md) |
| `globalToLocal` | public, inherited | [open](DisplayObjectContainer-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](DisplayObjectContainer-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](DisplayObjectContainer-class/hitTestPoint-method.md) |
| `localToGlobal` | public, inherited | [open](DisplayObjectContainer-class/localToGlobal-method.md) |
| `notifyListener` | protected, inherited | [open](DisplayObjectContainer-class/notifyListener-method.md) |
| `once` | public, inherited | [open](DisplayObjectContainer-class/once-method.md) |
| `removeChild` | public | [open](DisplayObjectContainer-class/removeChild-method.md) |
| `removeChildAt` | public | [open](DisplayObjectContainer-class/removeChildAt-method.md) |
| `removeChildren` | public | [open](DisplayObjectContainer-class/removeChildren-method.md) |
| `removeEventListener` | public, inherited | [open](DisplayObjectContainer-class/removeEventListener-method.md) |
| `setChildIndex` | public | [open](DisplayObjectContainer-class/setChildIndex-method.md) |
| `sortChildren` | public | [open](DisplayObjectContainer-class/sortChildren-method.md) |
| `swapChildren` | public | [open](DisplayObjectContainer-class/swapChildren-method.md) |
| `swapChildrenAt` | public | [open](DisplayObjectContainer-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](DisplayObjectContainer-class/updateCacheTexture-method.md) |
| `willTrigger` | public, inherited | [open](DisplayObjectContainer-class/willTrigger-method.md) |
