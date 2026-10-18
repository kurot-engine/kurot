# MovieClipData

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
class MovieClipData
```

Holds format-agnostic frame data for a MovieClip animation.

MovieClip reads the frame sequence, labels, and events from this object. The
owning animation scheduler may use frameRate and per-frame duration metadata
when deciding when to call MovieClip.advanceFrame().

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](MovieClipData-class/constructor-constructor.md) |
| `frameCount` | public | [open](MovieClipData-class/frameCount-accessor.md) |
| `frameRate` | public | [open](MovieClipData-class/frameRate-accessor.md) |
| `totalDuration` | public | [open](MovieClipData-class/totalDuration-accessor.md) |
| `addFrame` | public | [open](MovieClipData-class/addFrame-method.md) |
| `getFrame` | public | [open](MovieClipData-class/getFrame-method.md) |
| `getFrameByLabel` | public | [open](MovieClipData-class/getFrameByLabel-method.md) |
| `getFrameLabel` | public | [open](MovieClipData-class/getFrameLabel-method.md) |
| `getFrameLabelForFrame` | public | [open](MovieClipData-class/getFrameLabelForFrame-method.md) |
| `getFrameLabelRange` | public | [open](MovieClipData-class/getFrameLabelRange-method.md) |
| `setFrameEvent` | public | [open](MovieClipData-class/setFrameEvent-method.md) |
| `setFrameLabel` | public | [open](MovieClipData-class/setFrameLabel-method.md) |
| `static fromSpriteSheet` | public | [open](MovieClipData-class/static-fromSpriteSheet-method.md) |
| `static fromTextureArray` | public | [open](MovieClipData-class/static-fromTextureArray-method.md) |
