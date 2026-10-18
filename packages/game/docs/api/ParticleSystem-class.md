# ParticleSystem

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
class ParticleSystem extends DisplayObject
```

Display object that emits, pools and advances textured particles.
Each running system owns a Core ticker callback. emissionRate is the
interval in milliseconds, not particles per second; stop(true) clears
particles and detaches its callback during view disposal.

Related types: [DisplayObject](../../../core/docs/api/DisplayObject-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](ParticleSystem-class/constructor-constructor.md) |
| `emissionTime` | public | [open](ParticleSystem-class/emissionTime-property.md) |
| `maxParticles` | public | [open](ParticleSystem-class/maxParticles-property.md) |
| `numParticles` | public | [open](ParticleSystem-class/numParticles-property.md) |
| `particleClass` | public | [open](ParticleSystem-class/particleClass-property.md) |
| `texture` | public | [open](ParticleSystem-class/texture-property.md) |
| `static defaultTouchEnabled` | public, inherited | [open](ParticleSystem-class/static-defaultTouchEnabled-property.md) |
| `static RENDER_TYPE_PARTICLE` | public | [open](ParticleSystem-class/static-RENDER_TYPE_PARTICLE-property.md) |
| `alpha` | public, inherited | [open](ParticleSystem-class/alpha-accessor.md) |
| `anchorOffsetX` | public, inherited | [open](ParticleSystem-class/anchorOffsetX-accessor.md) |
| `anchorOffsetY` | public, inherited | [open](ParticleSystem-class/anchorOffsetY-accessor.md) |
| `blendMode` | public, inherited | [open](ParticleSystem-class/blendMode-accessor.md) |
| `cacheAsBitmap` | public, inherited | [open](ParticleSystem-class/cacheAsBitmap-accessor.md) |
| `emissionRate` | public | [open](ParticleSystem-class/emissionRate-accessor.md) |
| `emitterBounds` | public | [open](ParticleSystem-class/emitterBounds-accessor.md) |
| `emitterX` | public | [open](ParticleSystem-class/emitterX-accessor.md) |
| `emitterY` | public | [open](ParticleSystem-class/emitterY-accessor.md) |
| `filters` | public, inherited | [open](ParticleSystem-class/filters-accessor.md) |
| `flipX` | public, inherited | [open](ParticleSystem-class/flipX-accessor.md) |
| `flipY` | public, inherited | [open](ParticleSystem-class/flipY-accessor.md) |
| `graphics` | public, inherited | [open](ParticleSystem-class/graphics-accessor.md) |
| `height` | public, inherited | [open](ParticleSystem-class/height-accessor.md) |
| `isCachedAsTexture` | public, inherited | [open](ParticleSystem-class/isCachedAsTexture-accessor.md) |
| `mask` | public, inherited | [open](ParticleSystem-class/mask-accessor.md) |
| `matrix` | public, inherited | [open](ParticleSystem-class/matrix-accessor.md) |
| `measuredHeight` | public, inherited | [open](ParticleSystem-class/measuredHeight-accessor.md) |
| `measuredWidth` | public, inherited | [open](ParticleSystem-class/measuredWidth-accessor.md) |
| `name` | public, inherited | [open](ParticleSystem-class/name-accessor.md) |
| `parent` | public, inherited | [open](ParticleSystem-class/parent-accessor.md) |
| `particles` | public | [open](ParticleSystem-class/particles-accessor.md) |
| `rotation` | public, inherited | [open](ParticleSystem-class/rotation-accessor.md) |
| `scaleX` | public, inherited | [open](ParticleSystem-class/scaleX-accessor.md) |
| `scaleY` | public, inherited | [open](ParticleSystem-class/scaleY-accessor.md) |
| `scrollRect` | public, inherited | [open](ParticleSystem-class/scrollRect-accessor.md) |
| `skewX` | public, inherited | [open](ParticleSystem-class/skewX-accessor.md) |
| `skewY` | public, inherited | [open](ParticleSystem-class/skewY-accessor.md) |
| `sortableChildren` | public, inherited | [open](ParticleSystem-class/sortableChildren-accessor.md) |
| `stage` | public, inherited | [open](ParticleSystem-class/stage-accessor.md) |
| `tint` | public, inherited | [open](ParticleSystem-class/tint-accessor.md) |
| `touchEnabled` | public, inherited | [open](ParticleSystem-class/touchEnabled-accessor.md) |
| `visible` | public, inherited | [open](ParticleSystem-class/visible-accessor.md) |
| `width` | public, inherited | [open](ParticleSystem-class/width-accessor.md) |
| `x` | public, inherited | [open](ParticleSystem-class/x-accessor.md) |
| `y` | public, inherited | [open](ParticleSystem-class/y-accessor.md) |
| `zIndex` | public, inherited | [open](ParticleSystem-class/zIndex-accessor.md) |
| `addEventListener` | public, inherited | [open](ParticleSystem-class/addEventListener-method.md) |
| `advanceParticle` | public | [open](ParticleSystem-class/advanceParticle-method.md) |
| `cacheAsTexture` | public, inherited | [open](ParticleSystem-class/cacheAsTexture-method.md) |
| `changeTexture` | public | [open](ParticleSystem-class/changeTexture-method.md) |
| `dispatchEvent` | public, inherited | [open](ParticleSystem-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](ParticleSystem-class/dispatchEventWith-method.md) |
| `getBounds` | public, inherited | [open](ParticleSystem-class/getBounds-method.md) |
| `getTransformedBounds` | public, inherited | [open](ParticleSystem-class/getTransformedBounds-method.md) |
| `globalToLocal` | public, inherited | [open](ParticleSystem-class/globalToLocal-method.md) |
| `hasEventListener` | public, inherited | [open](ParticleSystem-class/hasEventListener-method.md) |
| `hitTestPoint` | public, inherited | [open](ParticleSystem-class/hitTestPoint-method.md) |
| `initParticle` | public | [open](ParticleSystem-class/initParticle-method.md) |
| `localToGlobal` | public, inherited | [open](ParticleSystem-class/localToGlobal-method.md) |
| `notifyListener` | protected, inherited | [open](ParticleSystem-class/notifyListener-method.md) |
| `once` | public, inherited | [open](ParticleSystem-class/once-method.md) |
| `removeEventListener` | public, inherited | [open](ParticleSystem-class/removeEventListener-method.md) |
| `setCurrentParticles` | public | [open](ParticleSystem-class/setCurrentParticles-method.md) |
| `sortChildren` | public, inherited | [open](ParticleSystem-class/sortChildren-method.md) |
| `start` | public | [open](ParticleSystem-class/start-method.md) |
| `stop` | public | [open](ParticleSystem-class/stop-method.md) |
| `updateCacheTexture` | public, inherited | [open](ParticleSystem-class/updateCacheTexture-method.md) |
| `willTrigger` | public, inherited | [open](ParticleSystem-class/willTrigger-method.md) |
