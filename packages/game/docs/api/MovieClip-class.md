# MovieClip

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
class MovieClip extends Bitmap
```

Sequence-frame animation display object.

Frame numbers are 1-based. The owning game loop decides when to call
advanceFrame(), keeping frame-rate scheduling outside the display object.

Related types: [Bitmap](../../../core/docs/api/Bitmap-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](MovieClip-class/constructor-constructor.md) |
| `bitmapData` | public, inherited | [open](MovieClip-class/bitmapData-property.md) |
| `bitmapHeight` | public, inherited | [open](MovieClip-class/bitmapHeight-property.md) |
| `bitmapOffsetX` | public, inherited | [open](MovieClip-class/bitmapOffsetX-property.md) |
| `bitmapOffsetY` | public, inherited | [open](MovieClip-class/bitmapOffsetY-property.md) |
| `bitmapWidth` | public, inherited | [open](MovieClip-class/bitmapWidth-property.md) |
| `bitmapX` | public, inherited | [open](MovieClip-class/bitmapX-property.md) |
| `bitmapY` | public, inherited | [open](MovieClip-class/bitmapY-property.md) |
| `sourceHeight` | public, inherited | [open](MovieClip-class/sourceHeight-property.md) |
| `sourceWidth` | public, inherited | [open](MovieClip-class/sourceWidth-property.md) |
| `textureHeight` | public, inherited | [open](MovieClip-class/textureHeight-property.md) |
| `textureWidth` | public, inherited | [open](MovieClip-class/textureWidth-property.md) |
| `static defaultSmoothing` | public, inherited | [open](MovieClip-class/static-defaultSmoothing-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](MovieClip-class/static-defaultTouchEnabled-property.md) |
| `alpha` | public, inherited | [open](MovieClip-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](MovieClip-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](MovieClip-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](MovieClip-class/blendMode-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](MovieClip-class/cacheAsBitmap-accessor.md) |
| `currentFrame` | public | [open](MovieClip-class/currentFrame-accessor.md) |
| `currentFrameLabel` | public | [open](MovieClip-class/currentFrameLabel-accessor.md) |
| `currentLabel` | public | [open](MovieClip-class/currentLabel-accessor.md) |
| `fillMode` | public, inherited | [open](MovieClip-class/fillMode-accessor.md) |
| `filters` | public, inherited | [open](MovieClip-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](MovieClip-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](MovieClip-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](MovieClip-class/graphics-accessor.md) |
| `height` | public, inherited | [open](MovieClip-class/height-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](MovieClip-class/isCachedAsTexture-accessor.md) |
| `isPlaying` | public | [open](MovieClip-class/isPlaying-accessor.md) |
| `mask` | public, inherited | [open](MovieClip-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](MovieClip-class/matrix-accessor.md) |
| `measuredHeight` | public, inherited | [open](MovieClip-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](MovieClip-class/measuredWidth-accessor.md) |
| `movieClipData` | public | [open](MovieClip-class/movieClipData-accessor.md) |
| `name` | public, inherited | [open](MovieClip-class/name-accessor.md) |
| `parent` | public, inherited | [open](MovieClip-class/parent-accessor.md) |
| `pixelHitTest` | public, inherited | [open](MovieClip-class/pixelHitTest-accessor.md) |
| `rotation` | public, inherited | [open](MovieClip-class/rotation-accessor.md) |
| `scale9Grid` | public, inherited | [open](MovieClip-class/scale9Grid-accessor.md) |
| `scaleX` | public, inherited | [open](MovieClip-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](MovieClip-class/scaleY-accessor.md) |
| `scrollRect` | public, inherited | [open](MovieClip-class/scrollRect-accessor.md) |
| `skewX` | public, inherited | [open](MovieClip-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](MovieClip-class/skewY-accessor.md) |
| `smoothing` | public, inherited | [open](MovieClip-class/smoothing-accessor.md) |
| `sortableChildren` | public, inherited | [open](MovieClip-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](MovieClip-class/stage-accessor.md) |
| `texture` | public, inherited | [open](MovieClip-class/texture-accessor.md) |
| `tint` | public, inherited | [open](MovieClip-class/tint-accessor.md) |
| `totalFrames` | public | [open](MovieClip-class/totalFrames-accessor.md) |
| `touchEnabled` | public, inherited | [open](MovieClip-class/touchEnabled-accessor.md) |
| `visible` | public, inherited | [open](MovieClip-class/visible-accessor.md) |
| `width` | public, inherited | [open](MovieClip-class/width-accessor.md) |
| `x` | public, inherited | [open](MovieClip-class/x-accessor.md) |
| `y` | public, inherited | [open](MovieClip-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](MovieClip-class/zIndex-accessor.md) |
| `addEventListener` | public, inherited | [open](MovieClip-class/addEventListener-method.md) |
| `advanceFrame` | public | [open](MovieClip-class/advanceFrame-method.md) |
| `cacheAsTexture` | public, inherited | [open](MovieClip-class/cacheAsTexture-method.md) |
| `dispatchEvent` | public, inherited | [open](MovieClip-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](MovieClip-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](MovieClip-class/getBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](MovieClip-class/getTransformedBounds-method.md) |
| `globalToLocal` | public, inherited | [open](MovieClip-class/globalToLocal-method.md) |
| `gotoAndPlay` | public | [open](MovieClip-class/gotoAndPlay-method.md) |
| `gotoAndStop` | public | [open](MovieClip-class/gotoAndStop-method.md) |
| `hasEventListener` | public, inherited | [open](MovieClip-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](MovieClip-class/hitTestPoint-method.md) |
| `localToGlobal` | public, inherited | [open](MovieClip-class/localToGlobal-method.md) |
| `nextFrame` | public | [open](MovieClip-class/nextFrame-method.md) |
| `notifyListener` | protected, inherited | [open](MovieClip-class/notifyListener-method.md) |
| `once` | public, inherited | [open](MovieClip-class/once-method.md) |
| `play` | public | [open](MovieClip-class/play-method.md) |
| `prevFrame` | public | [open](MovieClip-class/prevFrame-method.md) |
| `removeEventListener` | public, inherited | [open](MovieClip-class/removeEventListener-method.md) |
| `sortChildren` | public, inherited | [open](MovieClip-class/sortChildren-method.md) |
| `stop` | public | [open](MovieClip-class/stop-method.md) |
| `updateCacheTexture` | public, inherited | [open](MovieClip-class/updateCacheTexture-method.md) |
| `willTrigger` | public, inherited | [open](MovieClip-class/willTrigger-method.md) |
