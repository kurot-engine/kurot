# SliderBase

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
class SliderBase extends Range
```

SliderBase — abstract base for slider components.

Extends [Range](Range-class.md) with thumb-drag interaction.
Subclasses ([HSlider](HSlider-class.md), [VSlider](VSlider-class.md)) set the direction.

Expected skin parts:
- `thumb` — the draggable handle
- `track` — (optional) the track area, clicking it jumps the thumb

**defaultProperty**

value

Related types: [Range](Range-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public, inherited | [open](SliderBase-class/constructor-constructor.md) |
| `isRenderGroup` | public, inherited | [open](SliderBase-class/isRenderGroup-property.md) |
| `skinNameExplicitlySet` | public, inherited | [open](SliderBase-class/skinNameExplicitlySet-property.md) |
| `ui` | public, inherited | [open](SliderBase-class/ui-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](SliderBase-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](SliderBase-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](SliderBase-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](SliderBase-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](SliderBase-class/blendMode-accessor.md) |
| `bottom` | public, inherited | [open](SliderBase-class/bottom-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](SliderBase-class/cacheAsBitmap-accessor.md) |
| `contentHeight` | public, inherited | [open](SliderBase-class/contentHeight-accessor.md) |
| `contentWidth` | public, inherited | [open](SliderBase-class/contentWidth-accessor.md) |
| `currentState` | public, inherited | [open](SliderBase-class/currentState-accessor.md) |
| `direction` | public | [open](SliderBase-class/direction-accessor.md) |
| `enabled` | public, inherited | [open](SliderBase-class/enabled-accessor.md) |
| `filters` | public, inherited | [open](SliderBase-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](SliderBase-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](SliderBase-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](SliderBase-class/graphics-accessor.md) |
| `height` | public, inherited | [open](SliderBase-class/height-accessor.md) |
| `horizontalCenter` | public, inherited | [open](SliderBase-class/horizontalCenter-accessor.md) |
| `hostComponentKey` | public, inherited | [open](SliderBase-class/hostComponentKey-accessor.md) |
| `includeInLayout` | public, inherited | [open](SliderBase-class/includeInLayout-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](SliderBase-class/isCachedAsTexture-accessor.md) |
| `left` | public, inherited | [open](SliderBase-class/left-accessor.md) |
| `liveDragging` | public | [open](SliderBase-class/liveDragging-accessor.md) |
| `mask` | public, inherited | [open](SliderBase-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](SliderBase-class/matrix-accessor.md) |
| `maxHeight` | public, inherited | [open](SliderBase-class/maxHeight-accessor.md) |
| `maximum` | public, inherited | [open](SliderBase-class/maximum-accessor.md) |
| `maxWidth` | public, inherited | [open](SliderBase-class/maxWidth-accessor.md) |
| `measuredHeight` | public, inherited | [open](SliderBase-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](SliderBase-class/measuredWidth-accessor.md) |
| `minHeight` | public, inherited | [open](SliderBase-class/minHeight-accessor.md) |
| `minimum` | public, inherited | [open](SliderBase-class/minimum-accessor.md) |
| `minWidth` | public, inherited | [open](SliderBase-class/minWidth-accessor.md) |
| `name` | public, inherited | [open](SliderBase-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](SliderBase-class/numChildren-accessor.md) |
| `numElements` | public, inherited | [open](SliderBase-class/numElements-accessor.md) |
| `parent` | public, inherited | [open](SliderBase-class/parent-accessor.md) |
| `pendingValue` | public | [open](SliderBase-class/pendingValue-accessor.md) |
| `percentHeight` | public, inherited | [open](SliderBase-class/percentHeight-accessor.md) |
| `percentWidth` | public, inherited | [open](SliderBase-class/percentWidth-accessor.md) |
| `right` | public, inherited | [open](SliderBase-class/right-accessor.md) |
| `rotation` | public, inherited | [open](SliderBase-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](SliderBase-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](SliderBase-class/scaleY-accessor.md) |
| `scrollH` | public, inherited | [open](SliderBase-class/scrollH-accessor.md) |
| `scrollRect` | public, inherited | [open](SliderBase-class/scrollRect-accessor.md) |
| `scrollV` | public, inherited | [open](SliderBase-class/scrollV-accessor.md) |
| `skewX` | public, inherited | [open](SliderBase-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](SliderBase-class/skewY-accessor.md) |
| `skin` | public, inherited | [open](SliderBase-class/skin-accessor.md) |
| `skinName` | public, inherited | [open](SliderBase-class/skinName-accessor.md) |
| `skinParts` | public, inherited | [open](SliderBase-class/skinParts-accessor.md) |
| `skinReady` | protected, inherited | [open](SliderBase-class/skinReady-accessor.md) |
| `snapInterval` | public, inherited | [open](SliderBase-class/snapInterval-accessor.md) |
| `sortableChildren` | public, inherited | [open](SliderBase-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](SliderBase-class/stage-accessor.md) |
| `thumb` | public | [open](SliderBase-class/thumb-accessor.md) |
| `tint` | public, inherited | [open](SliderBase-class/tint-accessor.md) |
| `top` | public, inherited | [open](SliderBase-class/top-accessor.md) |
| `touchChildren` | public, inherited | [open](SliderBase-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](SliderBase-class/touchEnabled-accessor.md) |
| `track` | public | [open](SliderBase-class/track-accessor.md) |
| `value` | public, inherited | [open](SliderBase-class/value-accessor.md) |
| `verticalCenter` | public, inherited | [open](SliderBase-class/verticalCenter-accessor.md) |
| `visible` | public, inherited | [open](SliderBase-class/visible-accessor.md) |
| `width` | public, inherited | [open](SliderBase-class/width-accessor.md) |
| `x` | public, inherited | [open](SliderBase-class/x-accessor.md) |
| `y` | public, inherited | [open](SliderBase-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](SliderBase-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](SliderBase-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](SliderBase-class/addChildAt-method.md) |
| `addEventListener` | public, inherited | [open](SliderBase-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](SliderBase-class/cacheAsTexture-method.md) |
| `childAdded` | public, inherited | [open](SliderBase-class/childAdded-method.md) |
| `childRemoved` | public, inherited | [open](SliderBase-class/childRemoved-method.md) |
| `childrenCreated` | public, inherited | [open](SliderBase-class/childrenCreated-method.md) |
| `commitProperties` | public, inherited | [open](SliderBase-class/commitProperties-method.md) |
| `contains` | public, inherited | [open](SliderBase-class/contains-method.md) |
| `createChildren` | public, inherited | [open](SliderBase-class/createChildren-method.md) |
| `dispatchEvent` | public, inherited | [open](SliderBase-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](SliderBase-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](SliderBase-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](SliderBase-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](SliderBase-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](SliderBase-class/getChildIndex-method.md) |
| `getCurrentState` | protected, inherited | [open](SliderBase-class/getCurrentState-method.md) |
| `getElementAt` | public, inherited | [open](SliderBase-class/getElementAt-method.md) |
| `getLayoutBounds` | public, inherited | [open](SliderBase-class/getLayoutBounds-method.md) |
| `getPreferredBounds` | public, inherited | [open](SliderBase-class/getPreferredBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](SliderBase-class/getTransformedBounds-method.md) |
| `getVirtualElementAt` | public, inherited | [open](SliderBase-class/getVirtualElementAt-method.md) |
| `globalToLocal` | public, inherited | [open](SliderBase-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](SliderBase-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](SliderBase-class/hitTestPoint-method.md) |
| `invalidateDisplayList` | public, inherited | [open](SliderBase-class/invalidateDisplayList-method.md) |
| `invalidateProperties` | public, inherited | [open](SliderBase-class/invalidateProperties-method.md) |
| `invalidateSize` | public, inherited | [open](SliderBase-class/invalidateSize-method.md) |
| `invalidateState` | public, inherited | [open](SliderBase-class/invalidateState-method.md) |
| `localToGlobal` | public, inherited | [open](SliderBase-class/localToGlobal-method.md) |
| `measure` | public, inherited | [open](SliderBase-class/measure-method.md) |
| `nearestValidValue` | protected, inherited | [open](SliderBase-class/nearestValidValue-method.md) |
| `notifyListener` | protected, inherited | [open](SliderBase-class/notifyListener-method.md) |
| `once` | public, inherited | [open](SliderBase-class/once-method.md) |
| `onSkinReady` | protected | [open](SliderBase-class/onSkinReady-method.md) |
| `onSkinRemoved` | protected | [open](SliderBase-class/onSkinRemoved-method.md) |
| `pointToValue` | protected | [open](SliderBase-class/pointToValue-method.md) |
| `removeChild` | public, inherited | [open](SliderBase-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](SliderBase-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](SliderBase-class/removeChildren-method.md) |
| `removeEventListener` | public, inherited | [open](SliderBase-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](SliderBase-class/setChildIndex-method.md) |
| `setContentSize` | public, inherited | [open](SliderBase-class/setContentSize-method.md) |
| `setLayoutBoundsPosition` | public, inherited | [open](SliderBase-class/setLayoutBoundsPosition-method.md) |
| `setLayoutBoundsSize` | public, inherited | [open](SliderBase-class/setLayoutBoundsSize-method.md) |
| `setMeasuredSize` | public, inherited | [open](SliderBase-class/setMeasuredSize-method.md) |
| `setSkin` | protected, inherited | [open](SliderBase-class/setSkin-method.md) |
| `setValue` | protected, inherited | [open](SliderBase-class/setValue-method.md) |
| `setValuePending` | protected, inherited | [open](SliderBase-class/setValuePending-method.md) |
| `setVirtualElementIndicesInView` | public, inherited | [open](SliderBase-class/setVirtualElementIndicesInView-method.md) |
| `sortChildren` | public, inherited | [open](SliderBase-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](SliderBase-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](SliderBase-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](SliderBase-class/updateCacheTexture-method.md) |
| `updateDisplayList` | public, inherited | [open](SliderBase-class/updateDisplayList-method.md) |
| `updateSkinDisplayList` | protected, inherited | [open](SliderBase-class/updateSkinDisplayList-method.md) |
| `validateDisplayList` | public, inherited | [open](SliderBase-class/validateDisplayList-method.md) |
| `validateNow` | public, inherited | [open](SliderBase-class/validateNow-method.md) |
| `validateProperties` | public, inherited | [open](SliderBase-class/validateProperties-method.md) |
| `validateSize` | public, inherited | [open](SliderBase-class/validateSize-method.md) |
| `willTrigger` | public, inherited | [open](SliderBase-class/willTrigger-method.md) |
