# Button

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
class Button extends Component implements IDisplayText
```

Button component with label, icon, and state management.

States: `up`, `down`, `disabled`, `upAndSelected`, `downAndSelected`, `disabledAndSelected`.

When the button is tapped (and enabled), it calls `buttonReleased()` which subclasses
can override. If `toggle` is true, the `selected` state is toggled automatically.

Related types: [Component](Component-class.md), [IDisplayText](IDisplayText-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Button-class/constructor-constructor.md) |
| `iconDisplay` | public | [open](Button-class/iconDisplay-property.md) |
| `isRenderGroup` | public, inherited | [open](Button-class/isRenderGroup-property.md) |
| `labelDisplay` | public | [open](Button-class/labelDisplay-property.md) |
| `skinNameExplicitlySet` | public, inherited | [open](Button-class/skinNameExplicitlySet-property.md) |
| `ui` | public, inherited | [open](Button-class/ui-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](Button-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](Button-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](Button-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](Button-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](Button-class/blendMode-accessor.md) |
| `bottom` | public, inherited | [open](Button-class/bottom-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](Button-class/cacheAsBitmap-accessor.md) |
| `contentHeight` | public, inherited | [open](Button-class/contentHeight-accessor.md) |
| `contentWidth` | public, inherited | [open](Button-class/contentWidth-accessor.md) |
| `currentState` | public, inherited | [open](Button-class/currentState-accessor.md) |
| `enabled` | public | [open](Button-class/enabled-accessor.md) |
| `filters` | public, inherited | [open](Button-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](Button-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](Button-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](Button-class/graphics-accessor.md) |
| `height` | public, inherited | [open](Button-class/height-accessor.md) |
| `horizontalCenter` | public, inherited | [open](Button-class/horizontalCenter-accessor.md) |
| `hostComponentKey` | public, inherited | [open](Button-class/hostComponentKey-accessor.md) |
| `icon` | public | [open](Button-class/icon-accessor.md) |
| `includeInLayout` | public, inherited | [open](Button-class/includeInLayout-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](Button-class/isCachedAsTexture-accessor.md) |
| `label` | public | [open](Button-class/label-accessor.md) |
| `left` | public, inherited | [open](Button-class/left-accessor.md) |
| `mask` | public, inherited | [open](Button-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](Button-class/matrix-accessor.md) |
| `maxHeight` | public, inherited | [open](Button-class/maxHeight-accessor.md) |
| `maxWidth` | public, inherited | [open](Button-class/maxWidth-accessor.md) |
| `measuredHeight` | public, inherited | [open](Button-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](Button-class/measuredWidth-accessor.md) |
| `minHeight` | public, inherited | [open](Button-class/minHeight-accessor.md) |
| `minWidth` | public, inherited | [open](Button-class/minWidth-accessor.md) |
| `name` | public, inherited | [open](Button-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](Button-class/numChildren-accessor.md) |
| `numElements` | public, inherited | [open](Button-class/numElements-accessor.md) |
| `parent` | public, inherited | [open](Button-class/parent-accessor.md) |
| `percentHeight` | public, inherited | [open](Button-class/percentHeight-accessor.md) |
| `percentWidth` | public, inherited | [open](Button-class/percentWidth-accessor.md) |
| `right` | public, inherited | [open](Button-class/right-accessor.md) |
| `rotation` | public, inherited | [open](Button-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](Button-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](Button-class/scaleY-accessor.md) |
| `scrollH` | public, inherited | [open](Button-class/scrollH-accessor.md) |
| `scrollRect` | public, inherited | [open](Button-class/scrollRect-accessor.md) |
| `scrollV` | public, inherited | [open](Button-class/scrollV-accessor.md) |
| `selected` | public | [open](Button-class/selected-accessor.md) |
| `skewX` | public, inherited | [open](Button-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](Button-class/skewY-accessor.md) |
| `skin` | public, inherited | [open](Button-class/skin-accessor.md) |
| `skinName` | public, inherited | [open](Button-class/skinName-accessor.md) |
| `skinParts` | public, inherited | [open](Button-class/skinParts-accessor.md) |
| `skinReady` | protected, inherited | [open](Button-class/skinReady-accessor.md) |
| `sortableChildren` | public, inherited | [open](Button-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](Button-class/stage-accessor.md) |
| `text` | public | [open](Button-class/text-accessor.md) |
| `tint` | public, inherited | [open](Button-class/tint-accessor.md) |
| `toggle` | public | [open](Button-class/toggle-accessor.md) |
| `top` | public, inherited | [open](Button-class/top-accessor.md) |
| `touchCaptured` | public | [open](Button-class/touchCaptured-accessor.md) |
| `touchChildren` | public, inherited | [open](Button-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](Button-class/touchEnabled-accessor.md) |
| `verticalCenter` | public, inherited | [open](Button-class/verticalCenter-accessor.md) |
| `visible` | public, inherited | [open](Button-class/visible-accessor.md) |
| `width` | public, inherited | [open](Button-class/width-accessor.md) |
| `x` | public, inherited | [open](Button-class/x-accessor.md) |
| `y` | public, inherited | [open](Button-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](Button-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](Button-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](Button-class/addChildAt-method.md) |
| `addEventListener` | public, inherited | [open](Button-class/addEventListener-method.md) |
| `buttonReleased` | protected | [open](Button-class/buttonReleased-method.md) |
| `cacheAsTexture` | public, inherited | [open](Button-class/cacheAsTexture-method.md) |
| `childAdded` | public, inherited | [open](Button-class/childAdded-method.md) |
| `childRemoved` | public, inherited | [open](Button-class/childRemoved-method.md) |
| `childrenCreated` | public, inherited | [open](Button-class/childrenCreated-method.md) |
| `commitProperties` | public, inherited | [open](Button-class/commitProperties-method.md) |
| `contains` | public, inherited | [open](Button-class/contains-method.md) |
| `createChildren` | public, inherited | [open](Button-class/createChildren-method.md) |
| `dispatchEvent` | public, inherited | [open](Button-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](Button-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](Button-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](Button-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](Button-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](Button-class/getChildIndex-method.md) |
| `getCurrentState` | protected | [open](Button-class/getCurrentState-method.md) |
| `getElementAt` | public, inherited | [open](Button-class/getElementAt-method.md) |
| `getLayoutBounds` | public, inherited | [open](Button-class/getLayoutBounds-method.md) |
| `getPreferredBounds` | public, inherited | [open](Button-class/getPreferredBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](Button-class/getTransformedBounds-method.md) |
| `getVirtualElementAt` | public, inherited | [open](Button-class/getVirtualElementAt-method.md) |
| `globalToLocal` | public, inherited | [open](Button-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](Button-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](Button-class/hitTestPoint-method.md) |
| `invalidateDisplayList` | public, inherited | [open](Button-class/invalidateDisplayList-method.md) |
| `invalidateProperties` | public, inherited | [open](Button-class/invalidateProperties-method.md) |
| `invalidateSize` | public, inherited | [open](Button-class/invalidateSize-method.md) |
| `invalidateState` | public, inherited | [open](Button-class/invalidateState-method.md) |
| `localToGlobal` | public, inherited | [open](Button-class/localToGlobal-method.md) |
| `measure` | public, inherited | [open](Button-class/measure-method.md) |
| `notifyListener` | protected, inherited | [open](Button-class/notifyListener-method.md) |
| `once` | public, inherited | [open](Button-class/once-method.md) |
| `onSkinReady` | protected | [open](Button-class/onSkinReady-method.md) |
| `onSkinRemoved` | protected | [open](Button-class/onSkinRemoved-method.md) |
| `removeChild` | public, inherited | [open](Button-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](Button-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](Button-class/removeChildren-method.md) |
| `removeEventListener` | public, inherited | [open](Button-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](Button-class/setChildIndex-method.md) |
| `setContentSize` | public, inherited | [open](Button-class/setContentSize-method.md) |
| `setLayoutBoundsPosition` | public, inherited | [open](Button-class/setLayoutBoundsPosition-method.md) |
| `setLayoutBoundsSize` | public, inherited | [open](Button-class/setLayoutBoundsSize-method.md) |
| `setMeasuredSize` | public, inherited | [open](Button-class/setMeasuredSize-method.md) |
| `setSkin` | protected, inherited | [open](Button-class/setSkin-method.md) |
| `setVirtualElementIndicesInView` | public, inherited | [open](Button-class/setVirtualElementIndicesInView-method.md) |
| `sortChildren` | public, inherited | [open](Button-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](Button-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](Button-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](Button-class/updateCacheTexture-method.md) |
| `updateDisplayList` | public, inherited | [open](Button-class/updateDisplayList-method.md) |
| `validateDisplayList` | public, inherited | [open](Button-class/validateDisplayList-method.md) |
| `validateNow` | public, inherited | [open](Button-class/validateNow-method.md) |
| `validateProperties` | public, inherited | [open](Button-class/validateProperties-method.md) |
| `validateSize` | public, inherited | [open](Button-class/validateSize-method.md) |
| `willTrigger` | public, inherited | [open](Button-class/willTrigger-method.md) |
