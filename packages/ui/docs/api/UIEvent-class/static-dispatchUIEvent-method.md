# static dispatchUIEvent

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
static dispatchUIEvent(target: IEventDispatcher, eventType: string, bubbles: boolean, cancelable: boolean): boolean;
```

Dispatches a UI event when the target has a listener.
Returns `true` without allocating an event when no listener is registered.

**Default bubbles:** `false`

**Default cancelable:** `false`

Related types: [IEventDispatcher](../../../../core/docs/api/IEventDispatcher-interface.md).
