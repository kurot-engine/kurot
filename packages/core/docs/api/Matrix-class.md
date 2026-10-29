# Matrix

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class Matrix
```

Mutable affine transform for logical display coordinates.
Rotation/skew inputs use the units of the individual method. Pooled and
shared instances are scratch values; clone when storing a transform.

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Matrix-class/constructor-constructor.md) |
| `a` | public | [open](Matrix-class/a-property.md) |
| `b` | public | [open](Matrix-class/b-property.md) |
| `c` | public | [open](Matrix-class/c-property.md) |
| `d` | public | [open](Matrix-class/d-property.md) |
| `tx` | public | [open](Matrix-class/tx-property.md) |
| `ty` | public | [open](Matrix-class/ty-property.md) |
| `append` | public | [open](Matrix-class/append-method.md) |
| `clone` | public | [open](Matrix-class/clone-method.md) |
| `concat` | public | [open](Matrix-class/concat-method.md) |
| `copyFrom` | public | [open](Matrix-class/copyFrom-method.md) |
| `createBox` | public | [open](Matrix-class/createBox-method.md) |
| `createGradientBox` | public | [open](Matrix-class/createGradientBox-method.md) |
| `deltaTransformPoint` | public | [open](Matrix-class/deltaTransformPoint-method.md) |
| `equals` | public | [open](Matrix-class/equals-method.md) |
| `getScaleX` | public | [open](Matrix-class/getScaleX-method.md) |
| `getScaleY` | public | [open](Matrix-class/getScaleY-method.md) |
| `getSkewX` | public | [open](Matrix-class/getSkewX-method.md) |
| `getSkewY` | public | [open](Matrix-class/getSkewY-method.md) |
| `identity` | public | [open](Matrix-class/identity-method.md) |
| `invert` | public | [open](Matrix-class/invert-method.md) |
| `invertInto` | public | [open](Matrix-class/invertInto-method.md) |
| `preMultiplyInto` | public | [open](Matrix-class/preMultiplyInto-method.md) |
| `prepend` | public | [open](Matrix-class/prepend-method.md) |
| `rotate` | public | [open](Matrix-class/rotate-method.md) |
| `scale` | public | [open](Matrix-class/scale-method.md) |
| `setTo` | public | [open](Matrix-class/setTo-method.md) |
| `toString` | public | [open](Matrix-class/toString-method.md) |
| `transformBounds` | public | [open](Matrix-class/transformBounds-method.md) |
| `transformPoint` | public | [open](Matrix-class/transformPoint-method.md) |
| `translate` | public | [open](Matrix-class/translate-method.md) |
| `updateScaleAndRotation` | public | [open](Matrix-class/updateScaleAndRotation-method.md) |
| `static create` | public | [open](Matrix-class/static-create-method.md) |
| `static release` | public | [open](Matrix-class/static-release-method.md) |
