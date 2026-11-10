# BackdropBlur

Package: `@kurot/core@3.6.0`. Generated from public declarations and JSDoc.

```ts
class BackdropBlur extends DisplayObject
```

Blurs previously drawn pixels in the current compositing layer. Later siblings
stay sharp. Alpha mixes the original and blurred premultiplied pixels; input
blocking and game suspension remain the application's responsibility.

```ts
import { BackdropBlur } from '@kurot/core';
import type { DisplayObjectContainer } from '@kurot/core';

export function insertBackdrop(layer: DisplayObjectContainer, width: number, height: number): BackdropBlur {
    const backdrop = new BackdropBlur({ width, height, blurX: 36, blurY: 36, quality: 1, resolution: 0.5 });
    layer.addChildAt(backdrop, 0);
    return backdrop;
}
```

Related types: [DisplayObject](DisplayObject-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](BackdropBlur-class/constructor-constructor.md) |
| `static defaultTouchEnabled` | public, inherited | [open](BackdropBlur-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](BackdropBlur-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](BackdropBlur-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](BackdropBlur-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](BackdropBlur-class/blendMode-accessor.md) |
| `blurX` | public | [open](BackdropBlur-class/blurX-accessor.md) |
| `blurY` | public | [open](BackdropBlur-class/blurY-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](BackdropBlur-class/cacheAsBitmap-accessor.md) |
| `filters` | public, inherited | [open](BackdropBlur-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](BackdropBlur-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](BackdropBlur-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](BackdropBlur-class/graphics-accessor.md) |
| `height` | public | [open](BackdropBlur-class/height-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](BackdropBlur-class/isCachedAsTexture-accessor.md) |
| `mask` | public, inherited | [open](BackdropBlur-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](BackdropBlur-class/matrix-accessor.md) |
| `measuredHeight` | public, inherited | [open](BackdropBlur-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](BackdropBlur-class/measuredWidth-accessor.md) |
| `name` | public, inherited | [open](BackdropBlur-class/name-accessor.md) |
| `parent` | public, inherited | [open](BackdropBlur-class/parent-accessor.md) |
| `quality` | public | [open](BackdropBlur-class/quality-accessor.md) |
| `resolution` | public | [open](BackdropBlur-class/resolution-accessor.md) |
| `rotation` | public, inherited | [open](BackdropBlur-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](BackdropBlur-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](BackdropBlur-class/scaleY-accessor.md) |
| `scrollRect` | public, inherited | [open](BackdropBlur-class/scrollRect-accessor.md) |
| `skewX` | public, inherited | [open](BackdropBlur-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](BackdropBlur-class/skewY-accessor.md) |
| `sortableChildren` | public, inherited | [open](BackdropBlur-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](BackdropBlur-class/stage-accessor.md) |
| `tint` | public, inherited | [open](BackdropBlur-class/tint-accessor.md) |
| `touchEnabled` | public, inherited | [open](BackdropBlur-class/touchEnabled-accessor.md) |
| `visible` | public, inherited | [open](BackdropBlur-class/visible-accessor.md) |
| `width` | public | [open](BackdropBlur-class/width-accessor.md) |
| `x` | public, inherited | [open](BackdropBlur-class/x-accessor.md) |
| `y` | public, inherited | [open](BackdropBlur-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](BackdropBlur-class/zIndex-accessor.md) |
| `addEventListener` | public, inherited | [open](BackdropBlur-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](BackdropBlur-class/cacheAsTexture-method.md) |
| `dispatchEvent` | public, inherited | [open](BackdropBlur-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](BackdropBlur-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](BackdropBlur-class/getBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](BackdropBlur-class/getTransformedBounds-method.md) |
| `globalToLocal` | public, inherited | [open](BackdropBlur-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](BackdropBlur-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](BackdropBlur-class/hitTestPoint-method.md) |
| `localToGlobal` | public, inherited | [open](BackdropBlur-class/localToGlobal-method.md) |
| `notifyListener` | protected, inherited | [open](BackdropBlur-class/notifyListener-method.md) |
| `once` | public, inherited | [open](BackdropBlur-class/once-method.md) |
| `removeEventListener` | public, inherited | [open](BackdropBlur-class/removeEventListener-method.md) |
| `sortChildren` | public, inherited | [open](BackdropBlur-class/sortChildren-method.md) |
| `updateCacheTexture` | public, inherited | [open](BackdropBlur-class/updateCacheTexture-method.md) |
| `willTrigger` | public, inherited | [open](BackdropBlur-class/willTrigger-method.md) |
