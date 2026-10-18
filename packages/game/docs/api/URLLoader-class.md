# URLLoader

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
class URLLoader extends EventDispatcher<URLLoaderEvents>
```

High-level resource loader, Egret-compatible.

Delegates to the appropriate core loader based on `dataFormat`,
then populates `data` and dispatches `Event.COMPLETE`.

**example**

```ts
import { Event, IOErrorEvent } from '@kurot/core';
import { URLLoader, URLLoaderDataFormat, URLRequest } from '@kurot/game';

const loader = new URLLoader();
loader.dataFormat = URLLoaderDataFormat.JSON;
loader.addEventListener(Event.COMPLETE, () => console.log(loader.data));
loader.addEventListener(IOErrorEvent.IO_ERROR, () => console.error('failed'));
loader.load(new URLRequest('data/config.json'));
```

Related types: [EventDispatcher](../../../core/docs/api/EventDispatcher-class.md), [URLLoaderEvents](supporting/game-URLLoaderEvents.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](URLLoader-class/constructor-constructor.md) |
| `data` | public | [open](URLLoader-class/data-property.md) |
| `dataFormat` | public | [open](URLLoader-class/dataFormat-property.md) |
| `addEventListener` | public, inherited | [open](URLLoader-class/addEventListener-method.md) |
| `close` | public | [open](URLLoader-class/close-method.md) |
| `dispatchEvent` | public, inherited | [open](URLLoader-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](URLLoader-class/dispatchEventWith-method.md) |
| `hasEventListener` | public, inherited | [open](URLLoader-class/hasEventListener-method.md) |
| `load` | public | [open](URLLoader-class/load-method.md) |
| `notifyListener` | protected, inherited | [open](URLLoader-class/notifyListener-method.md) |
| `once` | public, inherited | [open](URLLoader-class/once-method.md) |
| `removeEventListener` | public, inherited | [open](URLLoader-class/removeEventListener-method.md) |
| `willTrigger` | public, inherited | [open](URLLoader-class/willTrigger-method.md) |
