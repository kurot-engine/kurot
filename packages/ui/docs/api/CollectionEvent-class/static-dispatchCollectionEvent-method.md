# static dispatchCollectionEvent

Package: `@kurot/ui@5.1.4`. Generated from public declarations and JSDoc.

```ts
static dispatchCollectionEvent<T = unknown>(target: IEventDispatcher, kind: CollectionEventKind, location: number, oldLocation: number, items: (T | undefined)[], oldItems: (T | undefined)[]): boolean;
```

Dispatches a collection-change event when the target has a listener.
Returns `true` without allocating an event when no listener is registered.

**Default location:** `-1`

**Default oldLocation:** `-1`

**Default items:** `[]`

**Default oldItems:** `[]`

Related types: [IEventDispatcher](../../../../core/docs/api/IEventDispatcher-interface.md), [CollectionEventKind](../CollectionEventKind-typealias.md).
