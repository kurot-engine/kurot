# ComboBox

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
class ComboBox extends Component implements IDisplayText
```

ComboBox — a drop-down selection component.

Displays a trigger button showing the currently selected item's label,
and a drop-down list that appears when the trigger is tapped.

**skinPart**

labelDisplay — Label showing the selected item label

**skinPart**

button        — the trigger Button that toggles the drop-down

**skinPart**

dropDown      — the drop-down container (typically a Scroller or Group)

**skinPart**

list          — the List inside the drop-down for item selection

States: `normal`, `open`, `disabled`.

**defaultProperty**

dataProvider

Related types: [Component](Component-class.md), [IDisplayText](IDisplayText-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](ComboBox-class/constructor-constructor.md) |
| `button` | public | [open](ComboBox-class/button-property.md) |
| `dropDown` | public | [open](ComboBox-class/dropDown-property.md) |
| `isRenderGroup` | public, inherited | [open](ComboBox-class/isRenderGroup-property.md) |
| `labelDisplay` | public | [open](ComboBox-class/labelDisplay-property.md) |
| `list` | public | [open](ComboBox-class/list-property.md) |
| `skinNameExplicitlySet` | public, inherited | [open](ComboBox-class/skinNameExplicitlySet-property.md) |
| `ui` | public, inherited | [open](ComboBox-class/ui-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](ComboBox-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](ComboBox-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](ComboBox-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](ComboBox-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](ComboBox-class/blendMode-accessor.md) |
| `bottom` | public, inherited | [open](ComboBox-class/bottom-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](ComboBox-class/cacheAsBitmap-accessor.md) |
| `contentHeight` | public, inherited | [open](ComboBox-class/contentHeight-accessor.md) |
| `contentWidth` | public, inherited | [open](ComboBox-class/contentWidth-accessor.md) |
| `currentState` | public, inherited | [open](ComboBox-class/currentState-accessor.md) |
| `dataProvider` | public | [open](ComboBox-class/dataProvider-accessor.md) |
| `enabled` | public, inherited | [open](ComboBox-class/enabled-accessor.md) |
| `filters` | public, inherited | [open](ComboBox-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](ComboBox-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](ComboBox-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](ComboBox-class/graphics-accessor.md) |
| `height` | public, inherited | [open](ComboBox-class/height-accessor.md) |
| `horizontalCenter` | public, inherited | [open](ComboBox-class/horizontalCenter-accessor.md) |
| `hostComponentKey` | public, inherited | [open](ComboBox-class/hostComponentKey-accessor.md) |
| `includeInLayout` | public, inherited | [open](ComboBox-class/includeInLayout-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](ComboBox-class/isCachedAsTexture-accessor.md) |
| `isOpen` | public | [open](ComboBox-class/isOpen-accessor.md) |
| `labelField` | public | [open](ComboBox-class/labelField-accessor.md) |
| `labelFunction` | public | [open](ComboBox-class/labelFunction-accessor.md) |
| `left` | public, inherited | [open](ComboBox-class/left-accessor.md) |
| `mask` | public, inherited | [open](ComboBox-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](ComboBox-class/matrix-accessor.md) |
| `maxHeight` | public, inherited | [open](ComboBox-class/maxHeight-accessor.md) |
| `maxWidth` | public, inherited | [open](ComboBox-class/maxWidth-accessor.md) |
| `measuredHeight` | public, inherited | [open](ComboBox-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](ComboBox-class/measuredWidth-accessor.md) |
| `minHeight` | public, inherited | [open](ComboBox-class/minHeight-accessor.md) |
| `minWidth` | public, inherited | [open](ComboBox-class/minWidth-accessor.md) |
| `name` | public, inherited | [open](ComboBox-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](ComboBox-class/numChildren-accessor.md) |
| `numElements` | public, inherited | [open](ComboBox-class/numElements-accessor.md) |
| `parent` | public, inherited | [open](ComboBox-class/parent-accessor.md) |
| `percentHeight` | public, inherited | [open](ComboBox-class/percentHeight-accessor.md) |
| `percentWidth` | public, inherited | [open](ComboBox-class/percentWidth-accessor.md) |
| `prompt` | public | [open](ComboBox-class/prompt-accessor.md) |
| `right` | public, inherited | [open](ComboBox-class/right-accessor.md) |
| `rotation` | public, inherited | [open](ComboBox-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](ComboBox-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](ComboBox-class/scaleY-accessor.md) |
| `scrollH` | public, inherited | [open](ComboBox-class/scrollH-accessor.md) |
| `scrollRect` | public, inherited | [open](ComboBox-class/scrollRect-accessor.md) |
| `scrollV` | public, inherited | [open](ComboBox-class/scrollV-accessor.md) |
| `selectedIndex` | public | [open](ComboBox-class/selectedIndex-accessor.md) |
| `selectedItem` | public | [open](ComboBox-class/selectedItem-accessor.md) |
| `skewX` | public, inherited | [open](ComboBox-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](ComboBox-class/skewY-accessor.md) |
| `skin` | public, inherited | [open](ComboBox-class/skin-accessor.md) |
| `skinName` | public, inherited | [open](ComboBox-class/skinName-accessor.md) |
| `skinParts` | public, inherited | [open](ComboBox-class/skinParts-accessor.md) |
| `skinReady` | protected, inherited | [open](ComboBox-class/skinReady-accessor.md) |
| `sortableChildren` | public, inherited | [open](ComboBox-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](ComboBox-class/stage-accessor.md) |
| `text` | public | [open](ComboBox-class/text-accessor.md) |
| `textColor` | public | [open](ComboBox-class/textColor-accessor.md) |
| `tint` | public, inherited | [open](ComboBox-class/tint-accessor.md) |
| `top` | public, inherited | [open](ComboBox-class/top-accessor.md) |
| `touchChildren` | public, inherited | [open](ComboBox-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](ComboBox-class/touchEnabled-accessor.md) |
| `verticalCenter` | public, inherited | [open](ComboBox-class/verticalCenter-accessor.md) |
| `visible` | public, inherited | [open](ComboBox-class/visible-accessor.md) |
| `width` | public, inherited | [open](ComboBox-class/width-accessor.md) |
| `x` | public, inherited | [open](ComboBox-class/x-accessor.md) |
| `y` | public, inherited | [open](ComboBox-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](ComboBox-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](ComboBox-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](ComboBox-class/addChildAt-method.md) |
| `addEventListener` | public, inherited | [open](ComboBox-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](ComboBox-class/cacheAsTexture-method.md) |
| `childAdded` | public, inherited | [open](ComboBox-class/childAdded-method.md) |
| `childRemoved` | public, inherited | [open](ComboBox-class/childRemoved-method.md) |
| `childrenCreated` | public, inherited | [open](ComboBox-class/childrenCreated-method.md) |
| `close` | public | [open](ComboBox-class/close-method.md) |
| `commitProperties` | public | [open](ComboBox-class/commitProperties-method.md) |
| `contains` | public, inherited | [open](ComboBox-class/contains-method.md) |
| `createChildren` | public, inherited | [open](ComboBox-class/createChildren-method.md) |
| `dispatchEvent` | public, inherited | [open](ComboBox-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](ComboBox-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](ComboBox-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](ComboBox-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](ComboBox-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](ComboBox-class/getChildIndex-method.md) |
| `getCurrentState` | protected | [open](ComboBox-class/getCurrentState-method.md) |
| `getElementAt` | public, inherited | [open](ComboBox-class/getElementAt-method.md) |
| `getLayoutBounds` | public, inherited | [open](ComboBox-class/getLayoutBounds-method.md) |
| `getPreferredBounds` | public, inherited | [open](ComboBox-class/getPreferredBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](ComboBox-class/getTransformedBounds-method.md) |
| `getVirtualElementAt` | public, inherited | [open](ComboBox-class/getVirtualElementAt-method.md) |
| `globalToLocal` | public, inherited | [open](ComboBox-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](ComboBox-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](ComboBox-class/hitTestPoint-method.md) |
| `invalidateDisplayList` | public, inherited | [open](ComboBox-class/invalidateDisplayList-method.md) |
| `invalidateProperties` | public, inherited | [open](ComboBox-class/invalidateProperties-method.md) |
| `invalidateSize` | public, inherited | [open](ComboBox-class/invalidateSize-method.md) |
| `invalidateState` | public, inherited | [open](ComboBox-class/invalidateState-method.md) |
| `itemToLabel` | public | [open](ComboBox-class/itemToLabel-method.md) |
| `localToGlobal` | public, inherited | [open](ComboBox-class/localToGlobal-method.md) |
| `measure` | public, inherited | [open](ComboBox-class/measure-method.md) |
| `notifyListener` | protected, inherited | [open](ComboBox-class/notifyListener-method.md) |
| `once` | public, inherited | [open](ComboBox-class/once-method.md) |
| `onSkinReady` | protected | [open](ComboBox-class/onSkinReady-method.md) |
| `onSkinRemoved` | protected | [open](ComboBox-class/onSkinRemoved-method.md) |
| `open` | public | [open](ComboBox-class/open-method.md) |
| `removeChild` | public, inherited | [open](ComboBox-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](ComboBox-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](ComboBox-class/removeChildren-method.md) |
| `removeEventListener` | public, inherited | [open](ComboBox-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](ComboBox-class/setChildIndex-method.md) |
| `setContentSize` | public, inherited | [open](ComboBox-class/setContentSize-method.md) |
| `setLayoutBoundsPosition` | public, inherited | [open](ComboBox-class/setLayoutBoundsPosition-method.md) |
| `setLayoutBoundsSize` | public, inherited | [open](ComboBox-class/setLayoutBoundsSize-method.md) |
| `setMeasuredSize` | public, inherited | [open](ComboBox-class/setMeasuredSize-method.md) |
| `setSkin` | protected, inherited | [open](ComboBox-class/setSkin-method.md) |
| `setVirtualElementIndicesInView` | public, inherited | [open](ComboBox-class/setVirtualElementIndicesInView-method.md) |
| `sortChildren` | public, inherited | [open](ComboBox-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](ComboBox-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](ComboBox-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](ComboBox-class/updateCacheTexture-method.md) |
| `updateDisplayList` | public, inherited | [open](ComboBox-class/updateDisplayList-method.md) |
| `validateDisplayList` | public, inherited | [open](ComboBox-class/validateDisplayList-method.md) |
| `validateNow` | public, inherited | [open](ComboBox-class/validateNow-method.md) |
| `validateProperties` | public, inherited | [open](ComboBox-class/validateProperties-method.md) |
| `validateSize` | public, inherited | [open](ComboBox-class/validateSize-method.md) |
| `willTrigger` | public, inherited | [open](ComboBox-class/willTrigger-method.md) |
