# TextInput

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
class TextInput extends Component implements IDisplayText
```

Text input component with prompt (placeholder) and password support.

Skin parts:
- `textDisplay`   — EditableText for actual input
- `promptDisplay` — Label shown when text is empty and unfocused

States: `normal`, `disabled`, `normalWithPrompt`, `disabledWithPrompt`

Egret-compatible: eui.TextInput

Related types: [Component](Component-class.md), [IDisplayText](IDisplayText-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](TextInput-class/constructor-constructor.md) |
| `isRenderGroup` | public, inherited | [open](TextInput-class/isRenderGroup-property.md) |
| `promptDisplay` | public | [open](TextInput-class/promptDisplay-property.md) |
| `skinNameExplicitlySet` | public, inherited | [open](TextInput-class/skinNameExplicitlySet-property.md) |
| `textDisplay` | public | [open](TextInput-class/textDisplay-property.md) |
| `ui` | public, inherited | [open](TextInput-class/ui-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](TextInput-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](TextInput-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](TextInput-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](TextInput-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](TextInput-class/blendMode-accessor.md) |
| `bottom` | public, inherited | [open](TextInput-class/bottom-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](TextInput-class/cacheAsBitmap-accessor.md) |
| `contentHeight` | public, inherited | [open](TextInput-class/contentHeight-accessor.md) |
| `contentWidth` | public, inherited | [open](TextInput-class/contentWidth-accessor.md) |
| `currentState` | public, inherited | [open](TextInput-class/currentState-accessor.md) |
| `displayAsPassword` | public | [open](TextInput-class/displayAsPassword-accessor.md) |
| `enabled` | public, inherited | [open](TextInput-class/enabled-accessor.md) |
| `filters` | public, inherited | [open](TextInput-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](TextInput-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](TextInput-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](TextInput-class/graphics-accessor.md) |
| `height` | public, inherited | [open](TextInput-class/height-accessor.md) |
| `horizontalCenter` | public, inherited | [open](TextInput-class/horizontalCenter-accessor.md) |
| `hostComponentKey` | public, inherited | [open](TextInput-class/hostComponentKey-accessor.md) |
| `includeInLayout` | public, inherited | [open](TextInput-class/includeInLayout-accessor.md) |
| `inputType` | public | [open](TextInput-class/inputType-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](TextInput-class/isCachedAsTexture-accessor.md) |
| `left` | public, inherited | [open](TextInput-class/left-accessor.md) |
| `mask` | public, inherited | [open](TextInput-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](TextInput-class/matrix-accessor.md) |
| `maxChars` | public | [open](TextInput-class/maxChars-accessor.md) |
| `maxHeight` | public, inherited | [open](TextInput-class/maxHeight-accessor.md) |
| `maxWidth` | public, inherited | [open](TextInput-class/maxWidth-accessor.md) |
| `measuredHeight` | public, inherited | [open](TextInput-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](TextInput-class/measuredWidth-accessor.md) |
| `minHeight` | public, inherited | [open](TextInput-class/minHeight-accessor.md) |
| `minWidth` | public, inherited | [open](TextInput-class/minWidth-accessor.md) |
| `name` | public, inherited | [open](TextInput-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](TextInput-class/numChildren-accessor.md) |
| `numElements` | public, inherited | [open](TextInput-class/numElements-accessor.md) |
| `parent` | public, inherited | [open](TextInput-class/parent-accessor.md) |
| `percentHeight` | public, inherited | [open](TextInput-class/percentHeight-accessor.md) |
| `percentWidth` | public, inherited | [open](TextInput-class/percentWidth-accessor.md) |
| `prompt` | public | [open](TextInput-class/prompt-accessor.md) |
| `restrict` | public | [open](TextInput-class/restrict-accessor.md) |
| `right` | public, inherited | [open](TextInput-class/right-accessor.md) |
| `rotation` | public, inherited | [open](TextInput-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](TextInput-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](TextInput-class/scaleY-accessor.md) |
| `scrollH` | public, inherited | [open](TextInput-class/scrollH-accessor.md) |
| `scrollRect` | public, inherited | [open](TextInput-class/scrollRect-accessor.md) |
| `scrollV` | public, inherited | [open](TextInput-class/scrollV-accessor.md) |
| `skewX` | public, inherited | [open](TextInput-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](TextInput-class/skewY-accessor.md) |
| `skin` | public, inherited | [open](TextInput-class/skin-accessor.md) |
| `skinName` | public, inherited | [open](TextInput-class/skinName-accessor.md) |
| `skinParts` | public, inherited | [open](TextInput-class/skinParts-accessor.md) |
| `skinReady` | protected, inherited | [open](TextInput-class/skinReady-accessor.md) |
| `sortableChildren` | public, inherited | [open](TextInput-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](TextInput-class/stage-accessor.md) |
| `text` | public | [open](TextInput-class/text-accessor.md) |
| `textColor` | public | [open](TextInput-class/textColor-accessor.md) |
| `tint` | public, inherited | [open](TextInput-class/tint-accessor.md) |
| `top` | public, inherited | [open](TextInput-class/top-accessor.md) |
| `touchChildren` | public, inherited | [open](TextInput-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](TextInput-class/touchEnabled-accessor.md) |
| `verticalCenter` | public, inherited | [open](TextInput-class/verticalCenter-accessor.md) |
| `visible` | public, inherited | [open](TextInput-class/visible-accessor.md) |
| `width` | public, inherited | [open](TextInput-class/width-accessor.md) |
| `x` | public, inherited | [open](TextInput-class/x-accessor.md) |
| `y` | public, inherited | [open](TextInput-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](TextInput-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](TextInput-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](TextInput-class/addChildAt-method.md) |
| `addEventListener` | public, inherited | [open](TextInput-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](TextInput-class/cacheAsTexture-method.md) |
| `childAdded` | public, inherited | [open](TextInput-class/childAdded-method.md) |
| `childRemoved` | public, inherited | [open](TextInput-class/childRemoved-method.md) |
| `childrenCreated` | public, inherited | [open](TextInput-class/childrenCreated-method.md) |
| `commitProperties` | public, inherited | [open](TextInput-class/commitProperties-method.md) |
| `contains` | public, inherited | [open](TextInput-class/contains-method.md) |
| `createChildren` | public, inherited | [open](TextInput-class/createChildren-method.md) |
| `dispatchEvent` | public, inherited | [open](TextInput-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](TextInput-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](TextInput-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](TextInput-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](TextInput-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](TextInput-class/getChildIndex-method.md) |
| `getCurrentState` | protected | [open](TextInput-class/getCurrentState-method.md) |
| `getElementAt` | public, inherited | [open](TextInput-class/getElementAt-method.md) |
| `getLayoutBounds` | public, inherited | [open](TextInput-class/getLayoutBounds-method.md) |
| `getPreferredBounds` | public, inherited | [open](TextInput-class/getPreferredBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](TextInput-class/getTransformedBounds-method.md) |
| `getVirtualElementAt` | public, inherited | [open](TextInput-class/getVirtualElementAt-method.md) |
| `globalToLocal` | public, inherited | [open](TextInput-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](TextInput-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](TextInput-class/hitTestPoint-method.md) |
| `invalidateDisplayList` | public, inherited | [open](TextInput-class/invalidateDisplayList-method.md) |
| `invalidateProperties` | public, inherited | [open](TextInput-class/invalidateProperties-method.md) |
| `invalidateSize` | public, inherited | [open](TextInput-class/invalidateSize-method.md) |
| `invalidateState` | public, inherited | [open](TextInput-class/invalidateState-method.md) |
| `localToGlobal` | public, inherited | [open](TextInput-class/localToGlobal-method.md) |
| `measure` | public, inherited | [open](TextInput-class/measure-method.md) |
| `notifyListener` | protected, inherited | [open](TextInput-class/notifyListener-method.md) |
| `once` | public, inherited | [open](TextInput-class/once-method.md) |
| `onSkinReady` | protected | [open](TextInput-class/onSkinReady-method.md) |
| `onSkinRemoved` | protected | [open](TextInput-class/onSkinRemoved-method.md) |
| `removeChild` | public, inherited | [open](TextInput-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](TextInput-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](TextInput-class/removeChildren-method.md) |
| `removeEventListener` | public, inherited | [open](TextInput-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](TextInput-class/setChildIndex-method.md) |
| `setContentSize` | public, inherited | [open](TextInput-class/setContentSize-method.md) |
| `setLayoutBoundsPosition` | public, inherited | [open](TextInput-class/setLayoutBoundsPosition-method.md) |
| `setLayoutBoundsSize` | public, inherited | [open](TextInput-class/setLayoutBoundsSize-method.md) |
| `setMeasuredSize` | public, inherited | [open](TextInput-class/setMeasuredSize-method.md) |
| `setSkin` | protected, inherited | [open](TextInput-class/setSkin-method.md) |
| `setVirtualElementIndicesInView` | public, inherited | [open](TextInput-class/setVirtualElementIndicesInView-method.md) |
| `sortChildren` | public, inherited | [open](TextInput-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](TextInput-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](TextInput-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](TextInput-class/updateCacheTexture-method.md) |
| `updateDisplayList` | public, inherited | [open](TextInput-class/updateDisplayList-method.md) |
| `validateDisplayList` | public, inherited | [open](TextInput-class/validateDisplayList-method.md) |
| `validateNow` | public, inherited | [open](TextInput-class/validateNow-method.md) |
| `validateProperties` | public, inherited | [open](TextInput-class/validateProperties-method.md) |
| `validateSize` | public, inherited | [open](TextInput-class/validateSize-method.md) |
| `willTrigger` | public, inherited | [open](TextInput-class/willTrigger-method.md) |
