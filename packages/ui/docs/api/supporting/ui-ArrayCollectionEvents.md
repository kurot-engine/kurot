# ArrayCollectionEvents

Supporting declaration from `@kurot/ui`, reachable through the public API.
This page does not imply that the name is importable from the package root.
Use the owning API parameter/result type or an exported public alias when writing application code.

```ts
export interface ArrayCollectionEvents extends EventMap {
    [CollectionEvent.COLLECTION_CHANGE]: CollectionEvent;
}
```

Related declarations: [EventMap](../../../../core/docs/api/EventMap-typealias.md), [CollectionEvent](../../../../ui/docs/api/CollectionEvent-class.md).
