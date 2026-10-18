# ImageLoader

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class ImageLoader extends EventDispatcher<ImageLoaderEvents>
```

Event-driven browser image loader.

`load()` replaces and cancels a prior image request. `close()` detaches the
browser handlers and clears the image source, preventing cancelled requests
from updating data or dispatching an event later.

Related types: [EventDispatcher](EventDispatcher-class.md), [ImageLoaderEvents](ImageLoaderEvents-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public, inherited | [open](ImageLoader-class/constructor-constructor.md) |
| `crossOrigin` | public | [open](ImageLoader-class/crossOrigin-property.md) |
| `data` | public | [open](ImageLoader-class/data-property.md) |
| `static crossOrigin` | public | [open](ImageLoader-class/static-crossOrigin-property.md) |
| `addEventListener` | public, inherited | [open](ImageLoader-class/addEventListener-method.md) |
| `close` | public | [open](ImageLoader-class/close-method.md) |
| `dispatchEvent` | public, inherited | [open](ImageLoader-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](ImageLoader-class/dispatchEventWith-method.md) |
| `hasEventListener` | public, inherited | [open](ImageLoader-class/hasEventListener-method.md) |
| `load` | public | [open](ImageLoader-class/load-method.md) |
| `notifyListener` | protected, inherited | [open](ImageLoader-class/notifyListener-method.md) |
| `once` | public, inherited | [open](ImageLoader-class/once-method.md) |
| `removeEventListener` | public, inherited | [open](ImageLoader-class/removeEventListener-method.md) |
| `willTrigger` | public, inherited | [open](ImageLoader-class/willTrigger-method.md) |
