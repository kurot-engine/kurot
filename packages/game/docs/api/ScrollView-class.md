# ScrollView

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
class ScrollView extends Sprite
```

Inertial scrolling container, Egret-compatible.

Wraps a content `Sprite` and provides touch-driven inertial scrolling
with bounce-back when the content is dragged past its bounds.

**example**

```ts
import { Sprite } from '@kurot/core';
import { ScrollView } from '@kurot/game';

const stage = new Sprite();
const myContentSprite = new Sprite();
const sv = new ScrollView();
sv.width = 640;
sv.height = 960;
sv.setContent(myContentSprite);
stage.addChild(sv);
```

Related types: [Sprite](../../../core/docs/api/Sprite-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](ScrollView-class/constructor-constructor.md) |
| `bounces` | public | [open](ScrollView-class/bounces-property.md) |
| `horizontalScrollPolicy` | public | [open](ScrollView-class/horizontalScrollPolicy-property.md) |
| `isRenderGroup` | public, inherited | [open](ScrollView-class/isRenderGroup-property.md) |
| `scrollBeginThreshold` | public | [open](ScrollView-class/scrollBeginThreshold-property.md) |
| `scrollSpeed` | public | [open](ScrollView-class/scrollSpeed-property.md) |
| `verticalScrollPolicy` | public | [open](ScrollView-class/verticalScrollPolicy-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](ScrollView-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](ScrollView-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](ScrollView-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](ScrollView-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](ScrollView-class/blendMode-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](ScrollView-class/cacheAsBitmap-accessor.md) |
| `content` | public | [open](ScrollView-class/content-accessor.md) |
| `filters` | public, inherited | [open](ScrollView-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](ScrollView-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](ScrollView-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](ScrollView-class/graphics-accessor.md) |
| `height` | public | [open](ScrollView-class/height-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](ScrollView-class/isCachedAsTexture-accessor.md) |
| `mask` | public, inherited | [open](ScrollView-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](ScrollView-class/matrix-accessor.md) |
| `measuredHeight` | public, inherited | [open](ScrollView-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](ScrollView-class/measuredWidth-accessor.md) |
| `name` | public, inherited | [open](ScrollView-class/name-accessor.md) |
| `numChildren` | public, inherited | [open](ScrollView-class/numChildren-accessor.md) |
| `parent` | public, inherited | [open](ScrollView-class/parent-accessor.md) |
| `rotation` | public, inherited | [open](ScrollView-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](ScrollView-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](ScrollView-class/scaleY-accessor.md) |
| `scrollBottom` | public | [open](ScrollView-class/scrollBottom-accessor.md) |
| `scrollLeft` | public | [open](ScrollView-class/scrollLeft-accessor.md) |
| `scrollRect` | public, inherited | [open](ScrollView-class/scrollRect-accessor.md) |
| `scrollRight` | public | [open](ScrollView-class/scrollRight-accessor.md) |
| `scrollTop` | public | [open](ScrollView-class/scrollTop-accessor.md) |
| `skewX` | public, inherited | [open](ScrollView-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](ScrollView-class/skewY-accessor.md) |
| `sortableChildren` | public, inherited | [open](ScrollView-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](ScrollView-class/stage-accessor.md) |
| `tint` | public, inherited | [open](ScrollView-class/tint-accessor.md) |
| `touchChildren` | public, inherited | [open](ScrollView-class/touchChildren-accessor.md) |
| `touchEnabled` | public, inherited | [open](ScrollView-class/touchEnabled-accessor.md) |
| `visible` | public, inherited | [open](ScrollView-class/visible-accessor.md) |
| `width` | public | [open](ScrollView-class/width-accessor.md) |
| `x` | public, inherited | [open](ScrollView-class/x-accessor.md) |
| `y` | public, inherited | [open](ScrollView-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](ScrollView-class/zIndex-accessor.md) |
| `addChild` | public, inherited | [open](ScrollView-class/addChild-method.md) |
| `addChildAt` | public, inherited | [open](ScrollView-class/addChildAt-method.md) |
| `addEventListener` | public, inherited | [open](ScrollView-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](ScrollView-class/cacheAsTexture-method.md) |
| `childAdded` | public, inherited | [open](ScrollView-class/childAdded-method.md) |
| `childRemoved` | public, inherited | [open](ScrollView-class/childRemoved-method.md) |
| `contains` | public, inherited | [open](ScrollView-class/contains-method.md) |
| `dispatchEvent` | public, inherited | [open](ScrollView-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](ScrollView-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](ScrollView-class/getBounds-method.md) |
| `getChildAt` | public, inherited | [open](ScrollView-class/getChildAt-method.md) |
| `getChildByName` | public, inherited | [open](ScrollView-class/getChildByName-method.md) |
| `getChildIndex` | public, inherited | [open](ScrollView-class/getChildIndex-method.md) |
| `getMaxScrollLeft` | public | [open](ScrollView-class/getMaxScrollLeft-method.md) |
| `getMaxScrollTop` | public | [open](ScrollView-class/getMaxScrollTop-method.md) |
| `getTransformedBounds` | public, inherited | [open](ScrollView-class/getTransformedBounds-method.md) |
| `globalToLocal` | public, inherited | [open](ScrollView-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](ScrollView-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](ScrollView-class/hitTestPoint-method.md) |
| `localToGlobal` | public, inherited | [open](ScrollView-class/localToGlobal-method.md) |
| `notifyListener` | protected, inherited | [open](ScrollView-class/notifyListener-method.md) |
| `once` | public, inherited | [open](ScrollView-class/once-method.md) |
| `removeChild` | public, inherited | [open](ScrollView-class/removeChild-method.md) |
| `removeChildAt` | public, inherited | [open](ScrollView-class/removeChildAt-method.md) |
| `removeChildren` | public, inherited | [open](ScrollView-class/removeChildren-method.md) |
| `removeContent` | public | [open](ScrollView-class/removeContent-method.md) |
| `removeEventListener` | public, inherited | [open](ScrollView-class/removeEventListener-method.md) |
| `setChildIndex` | public, inherited | [open](ScrollView-class/setChildIndex-method.md) |
| `setContent` | public | [open](ScrollView-class/setContent-method.md) |
| `setScrollLeft` | public | [open](ScrollView-class/setScrollLeft-method.md) |
| `setScrollPosition` | public | [open](ScrollView-class/setScrollPosition-method.md) |
| `setScrollTop` | public | [open](ScrollView-class/setScrollTop-method.md) |
| `sortChildren` | public, inherited | [open](ScrollView-class/sortChildren-method.md) |
| `swapChildren` | public, inherited | [open](ScrollView-class/swapChildren-method.md) |
| `swapChildrenAt` | public, inherited | [open](ScrollView-class/swapChildrenAt-method.md) |
| `updateCacheTexture` | public, inherited | [open](ScrollView-class/updateCacheTexture-method.md) |
| `willTrigger` | public, inherited | [open](ScrollView-class/willTrigger-method.md) |
