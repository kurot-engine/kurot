# ItemRenderer

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
class ItemRenderer<TSkin extends string = string> extends Component<TSkin> implements IItemRenderer
```

Base class for item renderers used in data-driven containers
(DataGroup, List, TabBar…).

States: `up` | `down` | `disabled` | `upAndSelected` | `downAndSelected`

**skinPart**

labelDisplay — optional Label for the item label

Related types: [Component](Component-class.md), [IItemRenderer](IItemRenderer-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](ItemRenderer-class/constructor-constructor.md) |
| `isRenderGroup` | public, inherited | [open](ItemRenderer-class/isRenderGroup-property.md) |
| `itemIndex` | public | [open](ItemRenderer-class/itemIndex-property.md) |
| `labelDisplay` | public | [open](ItemRenderer-class/labelDisplay-property.md) |
| `skinNameExplicitlySet` | public, inherited | [open](ItemRenderer-class/skinNameExplicitlySet-property.md) |
| `ui` | public, inherited | [open](ItemRenderer-class/ui-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](ItemRenderer-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](ItemRenderer-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](ItemRenderer-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](ItemRenderer-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](ItemRenderer-class/blendMode-accessor.md) |
| `bottom` | public, inherited | [open](ItemRenderer-class/bottom-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](ItemRenderer-class/cacheAsBitmap-accessor.md) |
| `contentHeight` | public, inherited | [open](ItemRenderer-class/contentHeight-accessor.md) |
| `contentWidth` | public, inherited | [open](ItemRenderer-class/contentWidth-accessor.md) |
| `currentState` | public, inherited | [open](ItemRenderer-class/currentState-accessor.md) |
| `data` | public | [open](ItemRenderer-class/data-accessor.md) |
| `enabled` | public, inherited | [open](ItemRenderer-class/enabled-accessor.md) |
| `filters` | public, inherited | [open](ItemRenderer-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](ItemRenderer-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](ItemRenderer-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](ItemRenderer-class/graphics-accessor.md) |
| `height` | public, inherited | [open](ItemRenderer-class/height-accessor.md) |
| `horizontalCenter` | public, inherited | [open](ItemRenderer-class/horizontalCenter-accessor.md) |
| `hostComponentKey` | public, inherited | [open](ItemRenderer-class/hostComponentKey-accessor.md) |
| `includeInLayout` | public, inherited | [open](ItemRenderer-class/includeInLayout-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](ItemRenderer-class/isCachedAsTexture-accessor.md) |
| `left` | public, inherited | [open](ItemRenderer-class/left-accessor.md) |
| `mask` | public, inherited | [open](ItemRenderer-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](ItemRenderer-class/matrix-accessor.md) |
| `maxHeight` | public, inherited | [open](ItemRenderer-class/maxHeight-accessor.md) |
| `maxWidth` | public, inherited | [open](ItemRenderer-class/maxWidth-accessor.md) |
| `measuredHeight` | public, inherited | [open](ItemRenderer-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](ItemRenderer-class/measuredWidth-accessor.md) |
| `minHeight` | public, inherited | [open](ItemRenderer-class/minHeight-accessor.md) |
| `minWidth` | public, inherited | [open](ItemRenderer-class/minWidth-accessor.md) |
| `name` | public, inherited | [open](ItemRenderer-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](ItemRenderer-class/numChildren-accessor.md) |
| `numElements` | public, inherited | [open](ItemRenderer-class/numElements-accessor.md) |
| `parent` | public, inherited | [open](ItemRenderer-class/parent-accessor.md) |
| `percentHeight` | public, inherited | [open](ItemRenderer-class/percentHeight-accessor.md) |
| `percentWidth` | public, inherited | [open](ItemRenderer-class/percentWidth-accessor.md) |
| `right` | public, inherited | [open](ItemRenderer-class/right-accessor.md) |
| `rotation` | public, inherited | [open](ItemRenderer-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](ItemRenderer-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](ItemRenderer-class/scaleY-accessor.md) |
| `scrollH` | public, inherited | [open](ItemRenderer-class/scrollH-accessor.md) |
| `scrollRect` | public, inherited | [open](ItemRenderer-class/scrollRect-accessor.md) |
| `scrollV` | public, inherited | [open](ItemRenderer-class/scrollV-accessor.md) |
| `selected` | public | [open](ItemRenderer-class/selected-accessor.md) |
| `skewX` | public, inherited | [open](ItemRenderer-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](ItemRenderer-class/skewY-accessor.md) |
| `skin` | public, inherited | [open](ItemRenderer-class/skin-accessor.md) |
| `skinName` | public, inherited | [open](ItemRenderer-class/skinName-accessor.md) |
| `skinParts` | public, inherited | [open](ItemRenderer-class/skinParts-accessor.md) |
| `skinReady` | protected, inherited | [open](ItemRenderer-class/skinReady-accessor.md) |
| `sortableChildren` | public, inherited | [open](ItemRenderer-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](ItemRenderer-class/stage-accessor.md) |
| `tint` | public, inherited | [open](ItemRenderer-class/tint-accessor.md) |
| `top` | public, inherited | [open](ItemRenderer-class/top-accessor.md) |
| `touchChildren` | public, inherited | [open](ItemRenderer-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](ItemRenderer-class/touchEnabled-accessor.md) |
| `verticalCenter` | public, inherited | [open](ItemRenderer-class/verticalCenter-accessor.md) |
| `visible` | public, inherited | [open](ItemRenderer-class/visible-accessor.md) |
| `width` | public, inherited | [open](ItemRenderer-class/width-accessor.md) |
| `x` | public, inherited | [open](ItemRenderer-class/x-accessor.md) |
| `y` | public, inherited | [open](ItemRenderer-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](ItemRenderer-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](ItemRenderer-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](ItemRenderer-class/addChildAt-method.md) |
| `addEventListener` | public, inherited | [open](ItemRenderer-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](ItemRenderer-class/cacheAsTexture-method.md) |
| `childAdded` | public, inherited | [open](ItemRenderer-class/childAdded-method.md) |
| `childRemoved` | public, inherited | [open](ItemRenderer-class/childRemoved-method.md) |
| `childrenCreated` | public, inherited | [open](ItemRenderer-class/childrenCreated-method.md) |
| `commitProperties` | public, inherited | [open](ItemRenderer-class/commitProperties-method.md) |
| `contains` | public, inherited | [open](ItemRenderer-class/contains-method.md) |
| `createChildren` | public, inherited | [open](ItemRenderer-class/createChildren-method.md) |
| `dataChanged` | protected | [open](ItemRenderer-class/dataChanged-method.md) |
| `dispatchEvent` | public, inherited | [open](ItemRenderer-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](ItemRenderer-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](ItemRenderer-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](ItemRenderer-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](ItemRenderer-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](ItemRenderer-class/getChildIndex-method.md) |
| `getCurrentState` | protected | [open](ItemRenderer-class/getCurrentState-method.md) |
| `getElementAt` | public, inherited | [open](ItemRenderer-class/getElementAt-method.md) |
| `getLayoutBounds` | public, inherited | [open](ItemRenderer-class/getLayoutBounds-method.md) |
| `getPreferredBounds` | public, inherited | [open](ItemRenderer-class/getPreferredBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](ItemRenderer-class/getTransformedBounds-method.md) |
| `getVirtualElementAt` | public, inherited | [open](ItemRenderer-class/getVirtualElementAt-method.md) |
| `globalToLocal` | public, inherited | [open](ItemRenderer-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](ItemRenderer-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](ItemRenderer-class/hitTestPoint-method.md) |
| `invalidateDisplayList` | public, inherited | [open](ItemRenderer-class/invalidateDisplayList-method.md) |
| `invalidateProperties` | public, inherited | [open](ItemRenderer-class/invalidateProperties-method.md) |
| `invalidateSize` | public, inherited | [open](ItemRenderer-class/invalidateSize-method.md) |
| `invalidateState` | public, inherited | [open](ItemRenderer-class/invalidateState-method.md) |
| `localToGlobal` | public, inherited | [open](ItemRenderer-class/localToGlobal-method.md) |
| `measure` | public, inherited | [open](ItemRenderer-class/measure-method.md) |
| `notifyListener` | protected, inherited | [open](ItemRenderer-class/notifyListener-method.md) |
| `once` | public, inherited | [open](ItemRenderer-class/once-method.md) |
| `onSkinReady` | protected | [open](ItemRenderer-class/onSkinReady-method.md) |
| `onSkinRemoved` | protected | [open](ItemRenderer-class/onSkinRemoved-method.md) |
| `removeChild` | public, inherited | [open](ItemRenderer-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](ItemRenderer-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](ItemRenderer-class/removeChildren-method.md) |
| `removeEventListener` | public, inherited | [open](ItemRenderer-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](ItemRenderer-class/setChildIndex-method.md) |
| `setContentSize` | public, inherited | [open](ItemRenderer-class/setContentSize-method.md) |
| `setLayoutBoundsPosition` | public, inherited | [open](ItemRenderer-class/setLayoutBoundsPosition-method.md) |
| `setLayoutBoundsSize` | public, inherited | [open](ItemRenderer-class/setLayoutBoundsSize-method.md) |
| `setMeasuredSize` | public, inherited | [open](ItemRenderer-class/setMeasuredSize-method.md) |
| `setSkin` | protected, inherited | [open](ItemRenderer-class/setSkin-method.md) |
| `setVirtualElementIndicesInView` | public, inherited | [open](ItemRenderer-class/setVirtualElementIndicesInView-method.md) |
| `sortChildren` | public, inherited | [open](ItemRenderer-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](ItemRenderer-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](ItemRenderer-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](ItemRenderer-class/updateCacheTexture-method.md) |
| `updateDisplayList` | public, inherited | [open](ItemRenderer-class/updateDisplayList-method.md) |
| `validateDisplayList` | public, inherited | [open](ItemRenderer-class/validateDisplayList-method.md) |
| `validateNow` | public, inherited | [open](ItemRenderer-class/validateNow-method.md) |
| `validateProperties` | public, inherited | [open](ItemRenderer-class/validateProperties-method.md) |
| `validateSize` | public, inherited | [open](ItemRenderer-class/validateSize-method.md) |
| `willTrigger` | public, inherited | [open](ItemRenderer-class/willTrigger-method.md) |
