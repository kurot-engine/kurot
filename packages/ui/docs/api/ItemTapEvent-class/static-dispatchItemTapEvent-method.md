# static dispatchItemTapEvent

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
static dispatchItemTapEvent(target: IEventDispatcher, item: unknown, itemIndex: number, itemRenderer?: ItemRenderer<string>): boolean;
```

Dispatches an item-tap event when the target has a listener.
Returns `true` without allocating an event when no listener is registered.

Related types: [IEventDispatcher](../../../../core/docs/api/IEventDispatcher-interface.md), [ItemRenderer](../ItemRenderer-class.md).
