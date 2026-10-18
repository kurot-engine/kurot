# Group

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
class Group extends Sprite implements IUIComponent, IViewport, ILayoutTarget, IUIOwner
```

Group is the base container for UI components.
It participates in the invalidation/validation layout cycle and
delegates child positioning to a pluggable LayoutBase instance.

Related types: [Sprite](../../../core/docs/api/Sprite-class.md), [IUIComponent](IUIComponent-interface.md), [IViewport](IViewport-interface.md), [ILayoutTarget](ILayoutTarget-interface.md), [IUIOwner](IUIOwner-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Group-class/constructor-constructor.md) |
| `isRenderGroup` | public, inherited | [open](Group-class/isRenderGroup-property.md) |
| `ui` | public | [open](Group-class/ui-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](Group-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](Group-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](Group-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](Group-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](Group-class/blendMode-accessor.md) |
| `bottom` | public | [open](Group-class/bottom-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](Group-class/cacheAsBitmap-accessor.md) |
| `contentHeight` | public | [open](Group-class/contentHeight-accessor.md) |
| `contentWidth` | public | [open](Group-class/contentWidth-accessor.md) |
| `currentState` | public | [open](Group-class/currentState-accessor.md) |
| `elementsContent` | public | [open](Group-class/elementsContent-accessor.md) |
| `filters` | public, inherited | [open](Group-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](Group-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](Group-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](Group-class/graphics-accessor.md) |
| `height` | public | [open](Group-class/height-accessor.md) |
| `horizontalCenter` | public | [open](Group-class/horizontalCenter-accessor.md) |
| `includeInLayout` | public | [open](Group-class/includeInLayout-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](Group-class/isCachedAsTexture-accessor.md) |
| `layout` | public | [open](Group-class/layout-accessor.md) |
| `left` | public | [open](Group-class/left-accessor.md) |
| `mask` | public, inherited | [open](Group-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](Group-class/matrix-accessor.md) |
| `maxHeight` | public | [open](Group-class/maxHeight-accessor.md) |
| `maxWidth` | public | [open](Group-class/maxWidth-accessor.md) |
| `measuredHeight` | public, inherited | [open](Group-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](Group-class/measuredWidth-accessor.md) |
| `minHeight` | public | [open](Group-class/minHeight-accessor.md) |
| `minWidth` | public | [open](Group-class/minWidth-accessor.md) |
| `name` | public, inherited | [open](Group-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](Group-class/numChildren-accessor.md) |
| `numElements` | public | [open](Group-class/numElements-accessor.md) |
| `parent` | public, inherited | [open](Group-class/parent-accessor.md) |
| `percentHeight` | public | [open](Group-class/percentHeight-accessor.md) |
| `percentWidth` | public | [open](Group-class/percentWidth-accessor.md) |
| `right` | public | [open](Group-class/right-accessor.md) |
| `rotation` | public, inherited | [open](Group-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](Group-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](Group-class/scaleY-accessor.md) |
| `scrollEnabled` | public | [open](Group-class/scrollEnabled-accessor.md) |
| `scrollH` | public | [open](Group-class/scrollH-accessor.md) |
| `scrollRect` | public, inherited | [open](Group-class/scrollRect-accessor.md) |
| `scrollV` | public | [open](Group-class/scrollV-accessor.md) |
| `skewX` | public, inherited | [open](Group-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](Group-class/skewY-accessor.md) |
| `sortableChildren` | public, inherited | [open](Group-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](Group-class/stage-accessor.md) |
| `states` | public | [open](Group-class/states-accessor.md) |
| `tint` | public, inherited | [open](Group-class/tint-accessor.md) |
| `top` | public | [open](Group-class/top-accessor.md) |
| `touchChildren` | public, inherited | [open](Group-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](Group-class/touchEnabled-accessor.md) |
| `touchThrough` | public | [open](Group-class/touchThrough-accessor.md) |
| `verticalCenter` | public | [open](Group-class/verticalCenter-accessor.md) |
| `visible` | public, inherited | [open](Group-class/visible-accessor.md) |
| `width` | public | [open](Group-class/width-accessor.md) |
| `x` | public, inherited | [open](Group-class/x-accessor.md) |
| `y` | public, inherited | [open](Group-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](Group-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](Group-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](Group-class/addChildAt-method.md) |
| `addEventListener` | public | [open](Group-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](Group-class/cacheAsTexture-method.md) |
| `childAdded` | public | [open](Group-class/childAdded-method.md) |
| `childRemoved` | public | [open](Group-class/childRemoved-method.md) |
| `childrenCreated` | public | [open](Group-class/childrenCreated-method.md) |
| `commitProperties` | public | [open](Group-class/commitProperties-method.md) |
| `contains` | public, inherited | [open](Group-class/contains-method.md) |
| `createChildren` | public | [open](Group-class/createChildren-method.md) |
| `dispatchEvent` | public, inherited | [open](Group-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](Group-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](Group-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](Group-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](Group-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](Group-class/getChildIndex-method.md) |
| `getCurrentState` | protected | [open](Group-class/getCurrentState-method.md) |
| `getElementAt` | public | [open](Group-class/getElementAt-method.md) |
| `getLayoutBounds` | public | [open](Group-class/getLayoutBounds-method.md) |
| `getPreferredBounds` | public | [open](Group-class/getPreferredBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](Group-class/getTransformedBounds-method.md) |
| `getVirtualElementAt` | public | [open](Group-class/getVirtualElementAt-method.md) |
| `globalToLocal` | public, inherited | [open](Group-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](Group-class/hasEventListener-method.md) |
| `hasState` | public | [open](Group-class/hasState-method.md) |
| `hitTestPoint` | public, inherited | [open](Group-class/hitTestPoint-method.md) |
| `invalidateDisplayList` | public | [open](Group-class/invalidateDisplayList-method.md) |
| `invalidateProperties` | public | [open](Group-class/invalidateProperties-method.md) |
| `invalidateSize` | public | [open](Group-class/invalidateSize-method.md) |
| `invalidateState` | public | [open](Group-class/invalidateState-method.md) |
| `localToGlobal` | public, inherited | [open](Group-class/localToGlobal-method.md) |
| `measure` | public | [open](Group-class/measure-method.md) |
| `notifyListener` | protected, inherited | [open](Group-class/notifyListener-method.md) |
| `once` | public, inherited | [open](Group-class/once-method.md) |
| `removeChild` | public, inherited | [open](Group-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](Group-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](Group-class/removeChildren-method.md) |
| `removeEventListener` | public | [open](Group-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](Group-class/setChildIndex-method.md) |
| `setContentSize` | public | [open](Group-class/setContentSize-method.md) |
| `setLayoutBoundsPosition` | public | [open](Group-class/setLayoutBoundsPosition-method.md) |
| `setLayoutBoundsSize` | public | [open](Group-class/setLayoutBoundsSize-method.md) |
| `setMeasuredSize` | public | [open](Group-class/setMeasuredSize-method.md) |
| `setVirtualElementIndicesInView` | public | [open](Group-class/setVirtualElementIndicesInView-method.md) |
| `sortChildren` | public, inherited | [open](Group-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](Group-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](Group-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](Group-class/updateCacheTexture-method.md) |
| `updateDisplayList` | public | [open](Group-class/updateDisplayList-method.md) |
| `validateDisplayList` | public | [open](Group-class/validateDisplayList-method.md) |
| `validateNow` | public | [open](Group-class/validateNow-method.md) |
| `validateProperties` | public | [open](Group-class/validateProperties-method.md) |
| `validateSize` | public | [open](Group-class/validateSize-method.md) |
| `willTrigger` | public, inherited | [open](Group-class/willTrigger-method.md) |
