# EventDispatcher

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class EventDispatcher<TMap extends EventMap = Record<string, Event>> implements IEventDispatcher
```

Dispatches listeners by event type, function identity and capture phase.
Priority orders listeners; once() unregisters after its notification.
DisplayObject adds scene-graph propagation on top of this dispatcher.

**example**

```ts
import { Event, EventDispatcher } from '@kurot/core';

const events = new EventDispatcher();
const onComplete = (event: Event): void => console.log(event.type);
events.addEventListener(Event.COMPLETE, onComplete);
events.dispatchEventWith(Event.COMPLETE);
events.removeEventListener(Event.COMPLETE, onComplete);
```

Related types: [IEventDispatcher](IEventDispatcher-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](EventDispatcher-class/constructor-constructor.md) |
| `addEventListener` | public | [open](EventDispatcher-class/addEventListener-method.md) |
| `dispatchEvent` | public | [open](EventDispatcher-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public | [open](EventDispatcher-class/dispatchEventWith-method.md) |
| `hasEventListener` | public | [open](EventDispatcher-class/hasEventListener-method.md) |
| `notifyListener` | protected | [open](EventDispatcher-class/notifyListener-method.md) |
| `once` | public | [open](EventDispatcher-class/once-method.md) |
| `removeEventListener` | public | [open](EventDispatcher-class/removeEventListener-method.md) |
| `willTrigger` | public | [open](EventDispatcher-class/willTrigger-method.md) |
