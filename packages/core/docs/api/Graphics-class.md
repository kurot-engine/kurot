# Graphics

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class Graphics
```

Retained local-space vector commands consumed by the renderer.
Fill and stroke calls append commands; clear() removes previous commands.
Graphics content is rasterized through Canvas for WebGL texture upload.

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](Graphics-class/constructor-constructor.md) |
| `canvasCacheDirty` | public | [open](Graphics-class/canvasCacheDirty-property.md) |
| `commands` | public | [open](Graphics-class/commands-property.md) |
| `offscreenBoundsX` | public | [open](Graphics-class/offscreenBoundsX-property.md) |
| `offscreenBoundsY` | public | [open](Graphics-class/offscreenBoundsY-property.md) |
| `offscreenCanvas` | public | [open](Graphics-class/offscreenCanvas-property.md) |
| `offscreenCtx` | public | [open](Graphics-class/offscreenCtx-property.md) |
| `targetDisplay` | public | [open](Graphics-class/targetDisplay-property.md) |
| `beginFill` | public | [open](Graphics-class/beginFill-method.md) |
| `beginGradientFill` | public | [open](Graphics-class/beginGradientFill-method.md) |
| `clear` | public | [open](Graphics-class/clear-method.md) |
| `cubicCurveTo` | public | [open](Graphics-class/cubicCurveTo-method.md) |
| `curveTo` | public | [open](Graphics-class/curveTo-method.md) |
| `drawArc` | public | [open](Graphics-class/drawArc-method.md) |
| `drawCircle` | public | [open](Graphics-class/drawCircle-method.md) |
| `drawEllipse` | public | [open](Graphics-class/drawEllipse-method.md) |
| `drawRect` | public | [open](Graphics-class/drawRect-method.md) |
| `drawRoundRect` | public | [open](Graphics-class/drawRoundRect-method.md) |
| `endFill` | public | [open](Graphics-class/endFill-method.md) |
| `lineStyle` | public | [open](Graphics-class/lineStyle-method.md) |
| `lineTo` | public | [open](Graphics-class/lineTo-method.md) |
| `moveTo` | public | [open](Graphics-class/moveTo-method.md) |
