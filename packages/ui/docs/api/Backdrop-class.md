# Backdrop

Package: `@kurot/ui@5.2.0`. Generated from public declarations and JSDoc.

```ts
class Backdrop extends Component
```

Layout-aware background blur, created in code without a Skin. Insert before
the modal mask and popup. Input passes through by default; game suspension
and input blocking remain application-owned. Rendering follows Core's
BackdropBlur isolation, cache restrictions and Canvas fallback.

```ts
import { Backdrop, UILayer } from '@kurot/ui';

export function addBackdrop(layer: UILayer): Backdrop {
    const backdrop = new Backdrop({ blurX: 36, blurY: 36, resolution: 0.5 });
    backdrop.left = backdrop.right = backdrop.top = backdrop.bottom = 0;
    layer.addChildAt(backdrop, 0);
    return backdrop;
}
```

Related types: [Component](Component-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Backdrop-class/constructor-constructor.md) |
| `isRenderGroup` | public, inherited | [open](Backdrop-class/isRenderGroup-property.md) |
| `skinNameExplicitlySet` | public, inherited | [open](Backdrop-class/skinNameExplicitlySet-property.md) |
| `ui` | public, inherited | [open](Backdrop-class/ui-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](Backdrop-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](Backdrop-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](Backdrop-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](Backdrop-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](Backdrop-class/blendMode-accessor.md) |
| `blurX` | public | [open](Backdrop-class/blurX-accessor.md) |
| `blurY` | public | [open](Backdrop-class/blurY-accessor.md) |
| `bottom` | public, inherited | [open](Backdrop-class/bottom-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](Backdrop-class/cacheAsBitmap-accessor.md) |
| `contentHeight` | public, inherited | [open](Backdrop-class/contentHeight-accessor.md) |
| `contentWidth` | public, inherited | [open](Backdrop-class/contentWidth-accessor.md) |
| `currentState` | public, inherited | [open](Backdrop-class/currentState-accessor.md) |
| `enabled` | public, inherited | [open](Backdrop-class/enabled-accessor.md) |
| `filters` | public, inherited | [open](Backdrop-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](Backdrop-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](Backdrop-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](Backdrop-class/graphics-accessor.md) |
| `height` | public, inherited | [open](Backdrop-class/height-accessor.md) |
| `horizontalCenter` | public, inherited | [open](Backdrop-class/horizontalCenter-accessor.md) |
| `hostComponentKey` | public, inherited | [open](Backdrop-class/hostComponentKey-accessor.md) |
| `includeInLayout` | public, inherited | [open](Backdrop-class/includeInLayout-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](Backdrop-class/isCachedAsTexture-accessor.md) |
| `left` | public, inherited | [open](Backdrop-class/left-accessor.md) |
| `mask` | public, inherited | [open](Backdrop-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](Backdrop-class/matrix-accessor.md) |
| `maxHeight` | public, inherited | [open](Backdrop-class/maxHeight-accessor.md) |
| `maxWidth` | public, inherited | [open](Backdrop-class/maxWidth-accessor.md) |
| `measuredHeight` | public, inherited | [open](Backdrop-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](Backdrop-class/measuredWidth-accessor.md) |
| `minHeight` | public, inherited | [open](Backdrop-class/minHeight-accessor.md) |
| `minWidth` | public, inherited | [open](Backdrop-class/minWidth-accessor.md) |
| `name` | public, inherited | [open](Backdrop-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](Backdrop-class/numChildren-accessor.md) |
| `numElements` | public, inherited | [open](Backdrop-class/numElements-accessor.md) |
| `parent` | public, inherited | [open](Backdrop-class/parent-accessor.md) |
| `percentHeight` | public, inherited | [open](Backdrop-class/percentHeight-accessor.md) |
| `percentWidth` | public, inherited | [open](Backdrop-class/percentWidth-accessor.md) |
| `quality` | public | [open](Backdrop-class/quality-accessor.md) |
| `resolution` | public | [open](Backdrop-class/resolution-accessor.md) |
| `right` | public, inherited | [open](Backdrop-class/right-accessor.md) |
| `rotation` | public, inherited | [open](Backdrop-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](Backdrop-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](Backdrop-class/scaleY-accessor.md) |
| `scrollH` | public, inherited | [open](Backdrop-class/scrollH-accessor.md) |
| `scrollRect` | public, inherited | [open](Backdrop-class/scrollRect-accessor.md) |
| `scrollV` | public, inherited | [open](Backdrop-class/scrollV-accessor.md) |
| `skewX` | public, inherited | [open](Backdrop-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](Backdrop-class/skewY-accessor.md) |
| `skin` | public, inherited | [open](Backdrop-class/skin-accessor.md) |
| `skinName` | public, inherited | [open](Backdrop-class/skinName-accessor.md) |
| `skinParts` | public, inherited | [open](Backdrop-class/skinParts-accessor.md) |
| `skinReady` | protected, inherited | [open](Backdrop-class/skinReady-accessor.md) |
| `sortableChildren` | public, inherited | [open](Backdrop-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](Backdrop-class/stage-accessor.md) |
| `tint` | public, inherited | [open](Backdrop-class/tint-accessor.md) |
| `top` | public, inherited | [open](Backdrop-class/top-accessor.md) |
| `touchChildren` | public, inherited | [open](Backdrop-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](Backdrop-class/touchEnabled-accessor.md) |
| `verticalCenter` | public, inherited | [open](Backdrop-class/verticalCenter-accessor.md) |
| `visible` | public, inherited | [open](Backdrop-class/visible-accessor.md) |
| `width` | public, inherited | [open](Backdrop-class/width-accessor.md) |
| `x` | public, inherited | [open](Backdrop-class/x-accessor.md) |
| `y` | public, inherited | [open](Backdrop-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](Backdrop-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](Backdrop-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](Backdrop-class/addChildAt-method.md) |
| `addEventListener` | public, inherited | [open](Backdrop-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](Backdrop-class/cacheAsTexture-method.md) |
| `childAdded` | public, inherited | [open](Backdrop-class/childAdded-method.md) |
| `childRemoved` | public, inherited | [open](Backdrop-class/childRemoved-method.md) |
| `childrenCreated` | public, inherited | [open](Backdrop-class/childrenCreated-method.md) |
| `commitProperties` | public, inherited | [open](Backdrop-class/commitProperties-method.md) |
| `contains` | public, inherited | [open](Backdrop-class/contains-method.md) |
| `createChildren` | public | [open](Backdrop-class/createChildren-method.md) |
| `dispatchEvent` | public, inherited | [open](Backdrop-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](Backdrop-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](Backdrop-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](Backdrop-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](Backdrop-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](Backdrop-class/getChildIndex-method.md) |
| `getCurrentState` | protected, inherited | [open](Backdrop-class/getCurrentState-method.md) |
| `getElementAt` | public, inherited | [open](Backdrop-class/getElementAt-method.md) |
| `getLayoutBounds` | public, inherited | [open](Backdrop-class/getLayoutBounds-method.md) |
| `getPreferredBounds` | public, inherited | [open](Backdrop-class/getPreferredBounds-method.md) |
| `getSkinPartValidator` | protected, inherited | [open](Backdrop-class/getSkinPartValidator-method.md) |
| `getTransformedBounds` | public, inherited | [open](Backdrop-class/getTransformedBounds-method.md) |
| `getVirtualElementAt` | public, inherited | [open](Backdrop-class/getVirtualElementAt-method.md) |
| `globalToLocal` | public, inherited | [open](Backdrop-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](Backdrop-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](Backdrop-class/hitTestPoint-method.md) |
| `invalidateDisplayList` | public, inherited | [open](Backdrop-class/invalidateDisplayList-method.md) |
| `invalidateProperties` | public, inherited | [open](Backdrop-class/invalidateProperties-method.md) |
| `invalidateSize` | public, inherited | [open](Backdrop-class/invalidateSize-method.md) |
| `invalidateState` | public, inherited | [open](Backdrop-class/invalidateState-method.md) |
| `localToGlobal` | public, inherited | [open](Backdrop-class/localToGlobal-method.md) |
| `measure` | public | [open](Backdrop-class/measure-method.md) |
| `notifyListener` | protected, inherited | [open](Backdrop-class/notifyListener-method.md) |
| `once` | public, inherited | [open](Backdrop-class/once-method.md) |
| `onSkinReady` | protected, inherited | [open](Backdrop-class/onSkinReady-method.md) |
| `onSkinRemoved` | protected, inherited | [open](Backdrop-class/onSkinRemoved-method.md) |
| `removeChild` | public, inherited | [open](Backdrop-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](Backdrop-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](Backdrop-class/removeChildren-method.md) |
| `removeEventListener` | public, inherited | [open](Backdrop-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](Backdrop-class/setChildIndex-method.md) |
| `setContentSize` | public, inherited | [open](Backdrop-class/setContentSize-method.md) |
| `setLayoutBoundsPosition` | public, inherited | [open](Backdrop-class/setLayoutBoundsPosition-method.md) |
| `setLayoutBoundsSize` | public, inherited | [open](Backdrop-class/setLayoutBoundsSize-method.md) |
| `setMeasuredSize` | public, inherited | [open](Backdrop-class/setMeasuredSize-method.md) |
| `setSkin` | protected, inherited | [open](Backdrop-class/setSkin-method.md) |
| `setVirtualElementIndicesInView` | public, inherited | [open](Backdrop-class/setVirtualElementIndicesInView-method.md) |
| `sortChildren` | public, inherited | [open](Backdrop-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](Backdrop-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](Backdrop-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](Backdrop-class/updateCacheTexture-method.md) |
| `updateDisplayList` | public | [open](Backdrop-class/updateDisplayList-method.md) |
| `validateDisplayList` | public, inherited | [open](Backdrop-class/validateDisplayList-method.md) |
| `validateNow` | public, inherited | [open](Backdrop-class/validateNow-method.md) |
| `validateProperties` | public, inherited | [open](Backdrop-class/validateProperties-method.md) |
| `validateSize` | public, inherited | [open](Backdrop-class/validateSize-method.md) |
| `willTrigger` | public, inherited | [open](Backdrop-class/willTrigger-method.md) |
