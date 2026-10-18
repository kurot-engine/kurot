# Component

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
class Component<TSkin extends string = string> extends Sprite implements IUIComponent, ILayoutTarget, IUIOwner
```

Base class for all skinnable UI components.

Subclasses should:
1. Override `getCurrentState()` to return the current view-state name.
2. Override `onSkinReady()` for setup that needs the complete skin.
3. Override `onSkinRemoved()` to clean up complete-skin bindings.
4. Override `createChildren()` to perform one-time initialization.

Related types: [Sprite](../../../core/docs/api/Sprite-class.md), [IUIComponent](IUIComponent-interface.md), [ILayoutTarget](ILayoutTarget-interface.md), [IUIOwner](IUIOwner-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Component-class/constructor-constructor.md) |
| `isRenderGroup` | public, inherited | [open](Component-class/isRenderGroup-property.md) |
| `skinNameExplicitlySet` | public | [open](Component-class/skinNameExplicitlySet-property.md) |
| `ui` | public | [open](Component-class/ui-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](Component-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](Component-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](Component-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](Component-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](Component-class/blendMode-accessor.md) |
| `bottom` | public | [open](Component-class/bottom-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](Component-class/cacheAsBitmap-accessor.md) |
| `contentHeight` | public | [open](Component-class/contentHeight-accessor.md) |
| `contentWidth` | public | [open](Component-class/contentWidth-accessor.md) |
| `currentState` | public | [open](Component-class/currentState-accessor.md) |
| `enabled` | public | [open](Component-class/enabled-accessor.md) |
| `filters` | public, inherited | [open](Component-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](Component-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](Component-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](Component-class/graphics-accessor.md) |
| `height` | public | [open](Component-class/height-accessor.md) |
| `horizontalCenter` | public | [open](Component-class/horizontalCenter-accessor.md) |
| `hostComponentKey` | public | [open](Component-class/hostComponentKey-accessor.md) |
| `includeInLayout` | public | [open](Component-class/includeInLayout-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](Component-class/isCachedAsTexture-accessor.md) |
| `left` | public | [open](Component-class/left-accessor.md) |
| `mask` | public, inherited | [open](Component-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](Component-class/matrix-accessor.md) |
| `maxHeight` | public | [open](Component-class/maxHeight-accessor.md) |
| `maxWidth` | public | [open](Component-class/maxWidth-accessor.md) |
| `measuredHeight` | public, inherited | [open](Component-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](Component-class/measuredWidth-accessor.md) |
| `minHeight` | public | [open](Component-class/minHeight-accessor.md) |
| `minWidth` | public | [open](Component-class/minWidth-accessor.md) |
| `name` | public, inherited | [open](Component-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](Component-class/numChildren-accessor.md) |
| `numElements` | public | [open](Component-class/numElements-accessor.md) |
| `parent` | public, inherited | [open](Component-class/parent-accessor.md) |
| `percentHeight` | public | [open](Component-class/percentHeight-accessor.md) |
| `percentWidth` | public | [open](Component-class/percentWidth-accessor.md) |
| `right` | public | [open](Component-class/right-accessor.md) |
| `rotation` | public, inherited | [open](Component-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](Component-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](Component-class/scaleY-accessor.md) |
| `scrollH` | public | [open](Component-class/scrollH-accessor.md) |
| `scrollRect` | public, inherited | [open](Component-class/scrollRect-accessor.md) |
| `scrollV` | public | [open](Component-class/scrollV-accessor.md) |
| `skewX` | public, inherited | [open](Component-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](Component-class/skewY-accessor.md) |
| `skin` | public | [open](Component-class/skin-accessor.md) |
| `skinName` | public | [open](Component-class/skinName-accessor.md) |
| `skinParts` | public | [open](Component-class/skinParts-accessor.md) |
| `skinReady` | protected | [open](Component-class/skinReady-accessor.md) |
| `sortableChildren` | public, inherited | [open](Component-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](Component-class/stage-accessor.md) |
| `tint` | public, inherited | [open](Component-class/tint-accessor.md) |
| `top` | public | [open](Component-class/top-accessor.md) |
| `touchChildren` | public | [open](Component-class/touchChildren-accessor.md) |
| `touchEnabled` | public | [open](Component-class/touchEnabled-accessor.md) |
| `verticalCenter` | public | [open](Component-class/verticalCenter-accessor.md) |
| `visible` | public, inherited | [open](Component-class/visible-accessor.md) |
| `width` | public | [open](Component-class/width-accessor.md) |
| `x` | public, inherited | [open](Component-class/x-accessor.md) |
| `y` | public, inherited | [open](Component-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](Component-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](Component-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](Component-class/addChildAt-method.md) |
| `addEventListener` | public | [open](Component-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](Component-class/cacheAsTexture-method.md) |
| `childAdded` | public | [open](Component-class/childAdded-method.md) |
| `childRemoved` | public | [open](Component-class/childRemoved-method.md) |
| `childrenCreated` | public | [open](Component-class/childrenCreated-method.md) |
| `commitProperties` | public | [open](Component-class/commitProperties-method.md) |
| `contains` | public, inherited | [open](Component-class/contains-method.md) |
| `createChildren` | public | [open](Component-class/createChildren-method.md) |
| `dispatchEvent` | public, inherited | [open](Component-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](Component-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](Component-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](Component-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](Component-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](Component-class/getChildIndex-method.md) |
| `getCurrentState` | protected | [open](Component-class/getCurrentState-method.md) |
| `getElementAt` | public | [open](Component-class/getElementAt-method.md) |
| `getLayoutBounds` | public | [open](Component-class/getLayoutBounds-method.md) |
| `getPreferredBounds` | public | [open](Component-class/getPreferredBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](Component-class/getTransformedBounds-method.md) |
| `getVirtualElementAt` | public | [open](Component-class/getVirtualElementAt-method.md) |
| `globalToLocal` | public, inherited | [open](Component-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](Component-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](Component-class/hitTestPoint-method.md) |
| `invalidateDisplayList` | public | [open](Component-class/invalidateDisplayList-method.md) |
| `invalidateProperties` | public | [open](Component-class/invalidateProperties-method.md) |
| `invalidateSize` | public | [open](Component-class/invalidateSize-method.md) |
| `invalidateState` | public | [open](Component-class/invalidateState-method.md) |
| `localToGlobal` | public, inherited | [open](Component-class/localToGlobal-method.md) |
| `measure` | public | [open](Component-class/measure-method.md) |
| `notifyListener` | protected, inherited | [open](Component-class/notifyListener-method.md) |
| `once` | public, inherited | [open](Component-class/once-method.md) |
| `onSkinReady` | protected | [open](Component-class/onSkinReady-method.md) |
| `onSkinRemoved` | protected | [open](Component-class/onSkinRemoved-method.md) |
| `removeChild` | public, inherited | [open](Component-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](Component-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](Component-class/removeChildren-method.md) |
| `removeEventListener` | public | [open](Component-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](Component-class/setChildIndex-method.md) |
| `setContentSize` | public | [open](Component-class/setContentSize-method.md) |
| `setLayoutBoundsPosition` | public | [open](Component-class/setLayoutBoundsPosition-method.md) |
| `setLayoutBoundsSize` | public | [open](Component-class/setLayoutBoundsSize-method.md) |
| `setMeasuredSize` | public | [open](Component-class/setMeasuredSize-method.md) |
| `setSkin` | protected | [open](Component-class/setSkin-method.md) |
| `setVirtualElementIndicesInView` | public | [open](Component-class/setVirtualElementIndicesInView-method.md) |
| `sortChildren` | public, inherited | [open](Component-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](Component-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](Component-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](Component-class/updateCacheTexture-method.md) |
| `updateDisplayList` | public | [open](Component-class/updateDisplayList-method.md) |
| `validateDisplayList` | public | [open](Component-class/validateDisplayList-method.md) |
| `validateNow` | public | [open](Component-class/validateNow-method.md) |
| `validateProperties` | public | [open](Component-class/validateProperties-method.md) |
| `validateSize` | public | [open](Component-class/validateSize-method.md) |
| `willTrigger` | public, inherited | [open](Component-class/willTrigger-method.md) |
