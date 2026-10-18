# VSlider

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
class VSlider extends SliderBase
```

VSlider — a vertical slider (bottom-to-top, standard slider convention).

Overrides `pointToValue` and `updateSkinDisplayList` to position the thumb
using the track's layout bounds (not the slider's own height), matching egret.

Related types: [SliderBase](SliderBase-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](VSlider-class/constructor-constructor.md) |
| `isRenderGroup` | public, inherited | [open](VSlider-class/isRenderGroup-property.md) |
| `skinNameExplicitlySet` | public, inherited | [open](VSlider-class/skinNameExplicitlySet-property.md) |
| `ui` | public, inherited | [open](VSlider-class/ui-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](VSlider-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](VSlider-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](VSlider-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](VSlider-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](VSlider-class/blendMode-accessor.md) |
| `bottom` | public, inherited | [open](VSlider-class/bottom-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](VSlider-class/cacheAsBitmap-accessor.md) |
| `contentHeight` | public, inherited | [open](VSlider-class/contentHeight-accessor.md) |
| `contentWidth` | public, inherited | [open](VSlider-class/contentWidth-accessor.md) |
| `currentState` | public, inherited | [open](VSlider-class/currentState-accessor.md) |
| `direction` | public, inherited | [open](VSlider-class/direction-accessor.md) |
| `enabled` | public, inherited | [open](VSlider-class/enabled-accessor.md) |
| `filters` | public, inherited | [open](VSlider-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](VSlider-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](VSlider-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](VSlider-class/graphics-accessor.md) |
| `height` | public, inherited | [open](VSlider-class/height-accessor.md) |
| `horizontalCenter` | public, inherited | [open](VSlider-class/horizontalCenter-accessor.md) |
| `hostComponentKey` | public, inherited | [open](VSlider-class/hostComponentKey-accessor.md) |
| `includeInLayout` | public, inherited | [open](VSlider-class/includeInLayout-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](VSlider-class/isCachedAsTexture-accessor.md) |
| `left` | public, inherited | [open](VSlider-class/left-accessor.md) |
| `liveDragging` | public, inherited | [open](VSlider-class/liveDragging-accessor.md) |
| `mask` | public, inherited | [open](VSlider-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](VSlider-class/matrix-accessor.md) |
| `maxHeight` | public, inherited | [open](VSlider-class/maxHeight-accessor.md) |
| `maximum` | public, inherited | [open](VSlider-class/maximum-accessor.md) |
| `maxWidth` | public, inherited | [open](VSlider-class/maxWidth-accessor.md) |
| `measuredHeight` | public, inherited | [open](VSlider-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](VSlider-class/measuredWidth-accessor.md) |
| `minHeight` | public, inherited | [open](VSlider-class/minHeight-accessor.md) |
| `minimum` | public, inherited | [open](VSlider-class/minimum-accessor.md) |
| `minWidth` | public, inherited | [open](VSlider-class/minWidth-accessor.md) |
| `name` | public, inherited | [open](VSlider-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](VSlider-class/numChildren-accessor.md) |
| `numElements` | public, inherited | [open](VSlider-class/numElements-accessor.md) |
| `parent` | public, inherited | [open](VSlider-class/parent-accessor.md) |
| `pendingValue` | public, inherited | [open](VSlider-class/pendingValue-accessor.md) |
| `percentHeight` | public, inherited | [open](VSlider-class/percentHeight-accessor.md) |
| `percentWidth` | public, inherited | [open](VSlider-class/percentWidth-accessor.md) |
| `right` | public, inherited | [open](VSlider-class/right-accessor.md) |
| `rotation` | public, inherited | [open](VSlider-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](VSlider-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](VSlider-class/scaleY-accessor.md) |
| `scrollH` | public, inherited | [open](VSlider-class/scrollH-accessor.md) |
| `scrollRect` | public, inherited | [open](VSlider-class/scrollRect-accessor.md) |
| `scrollV` | public, inherited | [open](VSlider-class/scrollV-accessor.md) |
| `skewX` | public, inherited | [open](VSlider-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](VSlider-class/skewY-accessor.md) |
| `skin` | public, inherited | [open](VSlider-class/skin-accessor.md) |
| `skinName` | public, inherited | [open](VSlider-class/skinName-accessor.md) |
| `skinParts` | public, inherited | [open](VSlider-class/skinParts-accessor.md) |
| `skinReady` | protected, inherited | [open](VSlider-class/skinReady-accessor.md) |
| `snapInterval` | public, inherited | [open](VSlider-class/snapInterval-accessor.md) |
| `sortableChildren` | public, inherited | [open](VSlider-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](VSlider-class/stage-accessor.md) |
| `thumb` | public, inherited | [open](VSlider-class/thumb-accessor.md) |
| `tint` | public, inherited | [open](VSlider-class/tint-accessor.md) |
| `top` | public, inherited | [open](VSlider-class/top-accessor.md) |
| `touchChildren` | public, inherited | [open](VSlider-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](VSlider-class/touchEnabled-accessor.md) |
| `track` | public, inherited | [open](VSlider-class/track-accessor.md) |
| `value` | public, inherited | [open](VSlider-class/value-accessor.md) |
| `verticalCenter` | public, inherited | [open](VSlider-class/verticalCenter-accessor.md) |
| `visible` | public, inherited | [open](VSlider-class/visible-accessor.md) |
| `width` | public, inherited | [open](VSlider-class/width-accessor.md) |
| `x` | public, inherited | [open](VSlider-class/x-accessor.md) |
| `y` | public, inherited | [open](VSlider-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](VSlider-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](VSlider-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](VSlider-class/addChildAt-method.md) |
| `addEventListener` | public, inherited | [open](VSlider-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](VSlider-class/cacheAsTexture-method.md) |
| `childAdded` | public, inherited | [open](VSlider-class/childAdded-method.md) |
| `childRemoved` | public, inherited | [open](VSlider-class/childRemoved-method.md) |
| `childrenCreated` | public, inherited | [open](VSlider-class/childrenCreated-method.md) |
| `commitProperties` | public, inherited | [open](VSlider-class/commitProperties-method.md) |
| `contains` | public, inherited | [open](VSlider-class/contains-method.md) |
| `createChildren` | public, inherited | [open](VSlider-class/createChildren-method.md) |
| `dispatchEvent` | public, inherited | [open](VSlider-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](VSlider-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](VSlider-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](VSlider-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](VSlider-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](VSlider-class/getChildIndex-method.md) |
| `getCurrentState` | protected, inherited | [open](VSlider-class/getCurrentState-method.md) |
| `getElementAt` | public, inherited | [open](VSlider-class/getElementAt-method.md) |
| `getLayoutBounds` | public, inherited | [open](VSlider-class/getLayoutBounds-method.md) |
| `getPreferredBounds` | public, inherited | [open](VSlider-class/getPreferredBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](VSlider-class/getTransformedBounds-method.md) |
| `getVirtualElementAt` | public, inherited | [open](VSlider-class/getVirtualElementAt-method.md) |
| `globalToLocal` | public, inherited | [open](VSlider-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](VSlider-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](VSlider-class/hitTestPoint-method.md) |
| `invalidateDisplayList` | public, inherited | [open](VSlider-class/invalidateDisplayList-method.md) |
| `invalidateProperties` | public, inherited | [open](VSlider-class/invalidateProperties-method.md) |
| `invalidateSize` | public, inherited | [open](VSlider-class/invalidateSize-method.md) |
| `invalidateState` | public, inherited | [open](VSlider-class/invalidateState-method.md) |
| `localToGlobal` | public, inherited | [open](VSlider-class/localToGlobal-method.md) |
| `measure` | public, inherited | [open](VSlider-class/measure-method.md) |
| `nearestValidValue` | protected, inherited | [open](VSlider-class/nearestValidValue-method.md) |
| `notifyListener` | protected, inherited | [open](VSlider-class/notifyListener-method.md) |
| `once` | public, inherited | [open](VSlider-class/once-method.md) |
| `onSkinReady` | protected, inherited | [open](VSlider-class/onSkinReady-method.md) |
| `onSkinRemoved` | protected, inherited | [open](VSlider-class/onSkinRemoved-method.md) |
| `pointToValue` | protected | [open](VSlider-class/pointToValue-method.md) |
| `removeChild` | public, inherited | [open](VSlider-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](VSlider-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](VSlider-class/removeChildren-method.md) |
| `removeEventListener` | public, inherited | [open](VSlider-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](VSlider-class/setChildIndex-method.md) |
| `setContentSize` | public, inherited | [open](VSlider-class/setContentSize-method.md) |
| `setLayoutBoundsPosition` | public, inherited | [open](VSlider-class/setLayoutBoundsPosition-method.md) |
| `setLayoutBoundsSize` | public, inherited | [open](VSlider-class/setLayoutBoundsSize-method.md) |
| `setMeasuredSize` | public, inherited | [open](VSlider-class/setMeasuredSize-method.md) |
| `setSkin` | protected, inherited | [open](VSlider-class/setSkin-method.md) |
| `setValue` | protected, inherited | [open](VSlider-class/setValue-method.md) |
| `setValuePending` | protected, inherited | [open](VSlider-class/setValuePending-method.md) |
| `setVirtualElementIndicesInView` | public, inherited | [open](VSlider-class/setVirtualElementIndicesInView-method.md) |
| `sortChildren` | public, inherited | [open](VSlider-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](VSlider-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](VSlider-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](VSlider-class/updateCacheTexture-method.md) |
| `updateDisplayList` | public, inherited | [open](VSlider-class/updateDisplayList-method.md) |
| `updateSkinDisplayList` | protected | [open](VSlider-class/updateSkinDisplayList-method.md) |
| `validateDisplayList` | public, inherited | [open](VSlider-class/validateDisplayList-method.md) |
| `validateNow` | public, inherited | [open](VSlider-class/validateNow-method.md) |
| `validateProperties` | public, inherited | [open](VSlider-class/validateProperties-method.md) |
| `validateSize` | public, inherited | [open](VSlider-class/validateSize-method.md) |
| `willTrigger` | public, inherited | [open](VSlider-class/willTrigger-method.md) |
