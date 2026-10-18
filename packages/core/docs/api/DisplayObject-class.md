# DisplayObject

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class DisplayObject extends EventDispatcher<DisplayObjectEvents>
```

Base scene-graph node with logical coordinates, transforms and events.
Removing a node from its parent does not release resources, application
listeners or Tweens. Centered flipX/flipY are independent of authored scale.

Related types: [EventDispatcher](EventDispatcher-class.md), [DisplayObjectEvents](DisplayObjectEvents-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](DisplayObject-class/constructor-constructor.md) |
| `static defaultTouchEnabled` | public | [open](DisplayObject-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public | [open](DisplayObject-class/alpha-accessor.md) |
| `anchorOffsetX` | public | [open](DisplayObject-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public | [open](DisplayObject-class/anchorOffsetY-accessor.md) |
| `blendMode` | public | [open](DisplayObject-class/blendMode-accessor.md) |
| `cacheAsBitmap` | public | [open](DisplayObject-class/cacheAsBitmap-accessor.md) |
| `filters` | public | [open](DisplayObject-class/filters-accessor.md) |
| `flipX` | public | [open](DisplayObject-class/flipX-accessor.md) |
| `flipY` | public | [open](DisplayObject-class/flipY-accessor.md) |
| `graphics` | public | [open](DisplayObject-class/graphics-accessor.md) |
| `height` | public | [open](DisplayObject-class/height-accessor.md) |
| `isCachedAsTexture` | public | [open](DisplayObject-class/isCachedAsTexture-accessor.md) |
| `mask` | public | [open](DisplayObject-class/mask-accessor.md) |
| `matrix` | public | [open](DisplayObject-class/matrix-accessor.md) |
| `measuredHeight` | public | [open](DisplayObject-class/measuredHeight-accessor.md) |
| `measuredWidth` | public | [open](DisplayObject-class/measuredWidth-accessor.md) |
| `name` | public | [open](DisplayObject-class/name-accessor.md) |
| `parent` | public | [open](DisplayObject-class/parent-accessor.md) |
| `rotation` | public | [open](DisplayObject-class/rotation-accessor.md) |
| `scaleX` | public | [open](DisplayObject-class/scaleX-accessor.md) |
| `scaleY` | public | [open](DisplayObject-class/scaleY-accessor.md) |
| `scrollRect` | public | [open](DisplayObject-class/scrollRect-accessor.md) |
| `skewX` | public | [open](DisplayObject-class/skewX-accessor.md) |
| `skewY` | public | [open](DisplayObject-class/skewY-accessor.md) |
| `sortableChildren` | public | [open](DisplayObject-class/sortableChildren-accessor.md) |
| `stage` | public | [open](DisplayObject-class/stage-accessor.md) |
| `tint` | public | [open](DisplayObject-class/tint-accessor.md) |
| `touchEnabled` | public | [open](DisplayObject-class/touchEnabled-accessor.md) |
| `visible` | public | [open](DisplayObject-class/visible-accessor.md) |
| `width` | public | [open](DisplayObject-class/width-accessor.md) |
| `x` | public | [open](DisplayObject-class/x-accessor.md) |
| `y` | public | [open](DisplayObject-class/y-accessor.md) |
| `zIndex` | public | [open](DisplayObject-class/zIndex-accessor.md) |
| `addEventListener` | public | [open](DisplayObject-class/addEventListener-method.md) |
| `cacheAsTexture` | public | [open](DisplayObject-class/cacheAsTexture-method.md) |
| `dispatchEvent` | public | [open](DisplayObject-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](DisplayObject-class/dispatchEventWith-method.md) |
| `getBounds` | public | [open](DisplayObject-class/getBounds-method.md) |
| `getTransformedBounds` | public | [open](DisplayObject-class/getTransformedBounds-method.md) |
| `globalToLocal` | public | [open](DisplayObject-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](DisplayObject-class/hasEventListener-method.md) |
| `hitTestPoint` | public | [open](DisplayObject-class/hitTestPoint-method.md) |
| `localToGlobal` | public | [open](DisplayObject-class/localToGlobal-method.md) |
| `notifyListener` | protected, inherited | [open](DisplayObject-class/notifyListener-method.md) |
| `once` | public, inherited | [open](DisplayObject-class/once-method.md) |
| `removeEventListener` | public | [open](DisplayObject-class/removeEventListener-method.md) |
| `sortChildren` | public | [open](DisplayObject-class/sortChildren-method.md) |
| `updateCacheTexture` | public | [open](DisplayObject-class/updateCacheTexture-method.md) |
| `willTrigger` | public | [open](DisplayObject-class/willTrigger-method.md) |
