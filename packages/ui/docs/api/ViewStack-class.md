# ViewStack

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
class ViewStack extends Group implements ICollection
```

ViewStack navigator container consisting of a collection of child containers
stacked on top of each other, where only one child at a time is visible.

When a different child is selected, it appears to replace the old one because
it appears in the same location. However, the old child still exists; it is
just invisible and excluded from layout.

Implements [ICollection](ICollection-interface.md) so it can be used directly as a
`dataProvider` for [TabBar](TabBar-class.md) (`<eui:TabBar dataProvider="{viewStack}"/>`).

States: none (container component).

Related types: [Group](Group-class.md), [ICollection](ICollection-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](ViewStack-class/constructor-constructor.md) |
| `isRenderGroup` | public, inherited | [open](ViewStack-class/isRenderGroup-property.md) |
| `ui` | public, inherited | [open](ViewStack-class/ui-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](ViewStack-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](ViewStack-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](ViewStack-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](ViewStack-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](ViewStack-class/blendMode-accessor.md) |
| `bottom` | public, inherited | [open](ViewStack-class/bottom-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](ViewStack-class/cacheAsBitmap-accessor.md) |
| `contentHeight` | public, inherited | [open](ViewStack-class/contentHeight-accessor.md) |
| `contentWidth` | public, inherited | [open](ViewStack-class/contentWidth-accessor.md) |
| `currentState` | public, inherited | [open](ViewStack-class/currentState-accessor.md) |
| `elementsContent` | public, inherited | [open](ViewStack-class/elementsContent-accessor.md) |
| `filters` | public, inherited | [open](ViewStack-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](ViewStack-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](ViewStack-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](ViewStack-class/graphics-accessor.md) |
| `height` | public, inherited | [open](ViewStack-class/height-accessor.md) |
| `horizontalCenter` | public, inherited | [open](ViewStack-class/horizontalCenter-accessor.md) |
| `includeInLayout` | public, inherited | [open](ViewStack-class/includeInLayout-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](ViewStack-class/isCachedAsTexture-accessor.md) |
| `layout` | public, inherited | [open](ViewStack-class/layout-accessor.md) |
| `left` | public, inherited | [open](ViewStack-class/left-accessor.md) |
| `length` | public | [open](ViewStack-class/length-accessor.md) |
| `mask` | public, inherited | [open](ViewStack-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](ViewStack-class/matrix-accessor.md) |
| `maxHeight` | public, inherited | [open](ViewStack-class/maxHeight-accessor.md) |
| `maxWidth` | public, inherited | [open](ViewStack-class/maxWidth-accessor.md) |
| `measuredHeight` | public, inherited | [open](ViewStack-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](ViewStack-class/measuredWidth-accessor.md) |
| `minHeight` | public, inherited | [open](ViewStack-class/minHeight-accessor.md) |
| `minWidth` | public, inherited | [open](ViewStack-class/minWidth-accessor.md) |
| `name` | public, inherited | [open](ViewStack-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](ViewStack-class/numChildren-accessor.md) |
| `numElements` | public, inherited | [open](ViewStack-class/numElements-accessor.md) |
| `parent` | public, inherited | [open](ViewStack-class/parent-accessor.md) |
| `percentHeight` | public, inherited | [open](ViewStack-class/percentHeight-accessor.md) |
| `percentWidth` | public, inherited | [open](ViewStack-class/percentWidth-accessor.md) |
| `right` | public, inherited | [open](ViewStack-class/right-accessor.md) |
| `rotation` | public, inherited | [open](ViewStack-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](ViewStack-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](ViewStack-class/scaleY-accessor.md) |
| `scrollEnabled` | public, inherited | [open](ViewStack-class/scrollEnabled-accessor.md) |
| `scrollH` | public, inherited | [open](ViewStack-class/scrollH-accessor.md) |
| `scrollRect` | public, inherited | [open](ViewStack-class/scrollRect-accessor.md) |
| `scrollV` | public, inherited | [open](ViewStack-class/scrollV-accessor.md) |
| `selectedChild` | public | [open](ViewStack-class/selectedChild-accessor.md) |
| `selectedIndex` | public | [open](ViewStack-class/selectedIndex-accessor.md) |
| `skewX` | public, inherited | [open](ViewStack-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](ViewStack-class/skewY-accessor.md) |
| `sortableChildren` | public, inherited | [open](ViewStack-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](ViewStack-class/stage-accessor.md) |
| `states` | public, inherited | [open](ViewStack-class/states-accessor.md) |
| `tint` | public, inherited | [open](ViewStack-class/tint-accessor.md) |
| `top` | public, inherited | [open](ViewStack-class/top-accessor.md) |
| `touchChildren` | public, inherited | [open](ViewStack-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](ViewStack-class/touchEnabled-accessor.md) |
| `touchThrough` | public, inherited | [open](ViewStack-class/touchThrough-accessor.md) |
| `verticalCenter` | public, inherited | [open](ViewStack-class/verticalCenter-accessor.md) |
| `visible` | public, inherited | [open](ViewStack-class/visible-accessor.md) |
| `width` | public, inherited | [open](ViewStack-class/width-accessor.md) |
| `x` | public, inherited | [open](ViewStack-class/x-accessor.md) |
| `y` | public, inherited | [open](ViewStack-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](ViewStack-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](ViewStack-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](ViewStack-class/addChildAt-method.md) |
| `addEventListener` | public, inherited | [open](ViewStack-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](ViewStack-class/cacheAsTexture-method.md) |
| `childAdded` | public | [open](ViewStack-class/childAdded-method.md) |
| `childRemoved` | public | [open](ViewStack-class/childRemoved-method.md) |
| `childrenCreated` | public, inherited | [open](ViewStack-class/childrenCreated-method.md) |
| `commitProperties` | public, inherited | [open](ViewStack-class/commitProperties-method.md) |
| `contains` | public, inherited | [open](ViewStack-class/contains-method.md) |
| `createChildren` | public, inherited | [open](ViewStack-class/createChildren-method.md) |
| `dispatchEvent` | public, inherited | [open](ViewStack-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](ViewStack-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](ViewStack-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](ViewStack-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](ViewStack-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](ViewStack-class/getChildIndex-method.md) |
| `getCurrentState` | protected, inherited | [open](ViewStack-class/getCurrentState-method.md) |
| `getElementAt` | public, inherited | [open](ViewStack-class/getElementAt-method.md) |
| `getItemAt` | public | [open](ViewStack-class/getItemAt-method.md) |
| `getItemIndex` | public | [open](ViewStack-class/getItemIndex-method.md) |
| `getLayoutBounds` | public, inherited | [open](ViewStack-class/getLayoutBounds-method.md) |
| `getPreferredBounds` | public, inherited | [open](ViewStack-class/getPreferredBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](ViewStack-class/getTransformedBounds-method.md) |
| `getVirtualElementAt` | public, inherited | [open](ViewStack-class/getVirtualElementAt-method.md) |
| `globalToLocal` | public, inherited | [open](ViewStack-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](ViewStack-class/hasEventListener-method.md) |
| `hasState` | public, inherited | [open](ViewStack-class/hasState-method.md) |
| `hitTestPoint` | public, inherited | [open](ViewStack-class/hitTestPoint-method.md) |
| `invalidateDisplayList` | public, inherited | [open](ViewStack-class/invalidateDisplayList-method.md) |
| `invalidateProperties` | public, inherited | [open](ViewStack-class/invalidateProperties-method.md) |
| `invalidateSize` | public, inherited | [open](ViewStack-class/invalidateSize-method.md) |
| `invalidateState` | public, inherited | [open](ViewStack-class/invalidateState-method.md) |
| `localToGlobal` | public, inherited | [open](ViewStack-class/localToGlobal-method.md) |
| `measure` | public | [open](ViewStack-class/measure-method.md) |
| `notifyListener` | protected, inherited | [open](ViewStack-class/notifyListener-method.md) |
| `once` | public, inherited | [open](ViewStack-class/once-method.md) |
| `removeChild` | public, inherited | [open](ViewStack-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](ViewStack-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](ViewStack-class/removeChildren-method.md) |
| `removeEventListener` | public, inherited | [open](ViewStack-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](ViewStack-class/setChildIndex-method.md) |
| `setContentSize` | public, inherited | [open](ViewStack-class/setContentSize-method.md) |
| `setLayoutBoundsPosition` | public, inherited | [open](ViewStack-class/setLayoutBoundsPosition-method.md) |
| `setLayoutBoundsSize` | public, inherited | [open](ViewStack-class/setLayoutBoundsSize-method.md) |
| `setMeasuredSize` | public, inherited | [open](ViewStack-class/setMeasuredSize-method.md) |
| `setVirtualElementIndicesInView` | public, inherited | [open](ViewStack-class/setVirtualElementIndicesInView-method.md) |
| `sortChildren` | public, inherited | [open](ViewStack-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](ViewStack-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](ViewStack-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](ViewStack-class/updateCacheTexture-method.md) |
| `updateDisplayList` | public | [open](ViewStack-class/updateDisplayList-method.md) |
| `validateDisplayList` | public, inherited | [open](ViewStack-class/validateDisplayList-method.md) |
| `validateNow` | public, inherited | [open](ViewStack-class/validateNow-method.md) |
| `validateProperties` | public, inherited | [open](ViewStack-class/validateProperties-method.md) |
| `validateSize` | public, inherited | [open](ViewStack-class/validateSize-method.md) |
| `willTrigger` | public, inherited | [open](ViewStack-class/willTrigger-method.md) |
