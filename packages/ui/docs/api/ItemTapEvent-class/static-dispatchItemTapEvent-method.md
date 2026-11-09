# static dispatchItemTapEvent

Package: `@kurot/ui@5.1.4`. Generated from public declarations and JSDoc.

```ts
static dispatchItemTapEvent<T = unknown>(target: IEventDispatcher, item: T | undefined, itemIndex: number, itemRenderer?: ItemRenderer<string, T>): boolean;
```

Dispatches an item-tap event when the target has a listener.
Returns `true` without allocating an event when no listener is registered.

Related types: [IEventDispatcher](../../../../core/docs/api/IEventDispatcher-interface.md), [ItemRenderer](../ItemRenderer-class.md).
