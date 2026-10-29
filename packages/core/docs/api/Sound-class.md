# Sound

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
class Sound extends EventDispatcher<SoundEvents>
```

Sound loads and plays audio.
Prefers Web Audio API for precise control and better mobile support.
Falls back to HTMLAudioElement when Web Audio API is unavailable.

Related types: [EventDispatcher](EventDispatcher-class.md), [SoundEvents](SoundEvents-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public, inherited | [open](Sound-class/constructor-constructor.md) |
| `type` | public | [open](Sound-class/type-property.md) |
| `length` | public | [open](Sound-class/length-accessor.md) |
| `addEventListener` | public, inherited | [open](Sound-class/addEventListener-method.md) |
| `close` | public | [open](Sound-class/close-method.md) |
| `dispatchEvent` | public, inherited | [open](Sound-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](Sound-class/dispatchEventWith-method.md) |
| `hasEventListener` | public, inherited | [open](Sound-class/hasEventListener-method.md) |
| `load` | public | [open](Sound-class/load-method.md) |
| `notifyListener` | protected, inherited | [open](Sound-class/notifyListener-method.md) |
| `once` | public, inherited | [open](Sound-class/once-method.md) |
| `play` | public | [open](Sound-class/play-method.md) |
| `removeEventListener` | public, inherited | [open](Sound-class/removeEventListener-method.md) |
| `willTrigger` | public, inherited | [open](Sound-class/willTrigger-method.md) |
