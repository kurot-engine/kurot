# BitmapText

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class BitmapText extends DisplayObject
```

Draws atlas glyphs directly through WebGL batching or Canvas 2D.
Width wraps by code point; use multiline=false for one unwrapped line.
Fonts are borrowed. Missing glyphs are skipped; U+0020 has a fallback advance.

Related types: [DisplayObject](DisplayObject-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](BitmapText-class/constructor-constructor.md) |
| `static defaultTouchEnabled` | public, inherited | [open](BitmapText-class/static-defaultTouchEnabled-property.md) |
| `static EMPTY_FACTOR` | public | [open](BitmapText-class/static-EMPTY_FACTOR-property.md) |
| `alpha` | public, inherited | [open](BitmapText-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](BitmapText-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](BitmapText-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](BitmapText-class/blendMode-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](BitmapText-class/cacheAsBitmap-accessor.md) |
| `filters` | public, inherited | [open](BitmapText-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](BitmapText-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](BitmapText-class/flipY-accessor.md) |
| `font` | public | [open](BitmapText-class/font-accessor.md) |
| `graphics` | public, inherited | [open](BitmapText-class/graphics-accessor.md) |
| `height` | public | [open](BitmapText-class/height-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](BitmapText-class/isCachedAsTexture-accessor.md) |
| `letterSpacing` | public | [open](BitmapText-class/letterSpacing-accessor.md) |
| `lineSpacing` | public | [open](BitmapText-class/lineSpacing-accessor.md) |
| `mask` | public, inherited | [open](BitmapText-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](BitmapText-class/matrix-accessor.md) |
| `measuredHeight` | public, inherited | [open](BitmapText-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](BitmapText-class/measuredWidth-accessor.md) |
| `multiline` | public | [open](BitmapText-class/multiline-accessor.md) |
| `name` | public, inherited | [open](BitmapText-class/name-accessor.md) |
| `parent` | public, inherited | [open](BitmapText-class/parent-accessor.md) |
| `rotation` | public, inherited | [open](BitmapText-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](BitmapText-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](BitmapText-class/scaleY-accessor.md) |
| `scrollRect` | public, inherited | [open](BitmapText-class/scrollRect-accessor.md) |
| `skewX` | public, inherited | [open](BitmapText-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](BitmapText-class/skewY-accessor.md) |
| `smoothing` | public | [open](BitmapText-class/smoothing-accessor.md) |
| `sortableChildren` | public, inherited | [open](BitmapText-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](BitmapText-class/stage-accessor.md) |
| `text` | public | [open](BitmapText-class/text-accessor.md) |
| `textAlign` | public | [open](BitmapText-class/textAlign-accessor.md) |
| `textHeight` | public | [open](BitmapText-class/textHeight-accessor.md) |
| `textWidth` | public | [open](BitmapText-class/textWidth-accessor.md) |
| `tint` | public, inherited | [open](BitmapText-class/tint-accessor.md) |
| `touchEnabled` | public, inherited | [open](BitmapText-class/touchEnabled-accessor.md) |
| `verticalAlign` | public | [open](BitmapText-class/verticalAlign-accessor.md) |
| `visible` | public, inherited | [open](BitmapText-class/visible-accessor.md) |
| `width` | public | [open](BitmapText-class/width-accessor.md) |
| `x` | public, inherited | [open](BitmapText-class/x-accessor.md) |
| `y` | public, inherited | [open](BitmapText-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](BitmapText-class/zIndex-accessor.md) |
| `addEventListener` | public, inherited | [open](BitmapText-class/addEventListener-method.md) |
| `cacheAsTexture` | public, inherited | [open](BitmapText-class/cacheAsTexture-method.md) |
| `dispatchEvent` | public, inherited | [open](BitmapText-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](BitmapText-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](BitmapText-class/getBounds-method.md) |
| `getGlyphs` | public | [open](BitmapText-class/getGlyphs-method.md) |
| `getLayout` | public | [open](BitmapText-class/getLayout-method.md) |
| `getLineHeights` | public | [open](BitmapText-class/getLineHeights-method.md) |
| `getTextLines` | public | [open](BitmapText-class/getTextLines-method.md) |
| `getTextLinesWidth` | public | [open](BitmapText-class/getTextLinesWidth-method.md) |
| `getTextStartX` | public | [open](BitmapText-class/getTextStartX-method.md) |
| `getTextStartY` | public | [open](BitmapText-class/getTextStartY-method.md) |
| `getTransformedBounds` | public, inherited | [open](BitmapText-class/getTransformedBounds-method.md) |
| `globalToLocal` | public, inherited | [open](BitmapText-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](BitmapText-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](BitmapText-class/hitTestPoint-method.md) |
| `localToGlobal` | public, inherited | [open](BitmapText-class/localToGlobal-method.md) |
| `measureText` | public | [open](BitmapText-class/measureText-method.md) |
| `notifyListener` | protected, inherited | [open](BitmapText-class/notifyListener-method.md) |
| `once` | public, inherited | [open](BitmapText-class/once-method.md) |
| `removeEventListener` | public, inherited | [open](BitmapText-class/removeEventListener-method.md) |
| `sortChildren` | public, inherited | [open](BitmapText-class/sortChildren-method.md) |
| `updateCacheTexture` | public, inherited | [open](BitmapText-class/updateCacheTexture-method.md) |
| `willTrigger` | public, inherited | [open](BitmapText-class/willTrigger-method.md) |
