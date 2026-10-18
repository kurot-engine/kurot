# static dispatchPropertyEvent

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
static dispatchPropertyEvent(target: IEventDispatcher, property: string): boolean;
```

Dispatches a property-change event when the target has a listener.
Returns `true` without allocating an event when no listener is registered.

Related types: [IEventDispatcher](../../../../core/docs/api/IEventDispatcher-interface.md).
