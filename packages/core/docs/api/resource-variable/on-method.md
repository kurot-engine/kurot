# on

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
on(type: ResourceEventType, listener: ResourceEventListener): void;
```

Listen for resource events.
Listeners persist until off() receives the same callback and event type.
Resource uses this API rather than EventDispatcher.addEventListener().

Related types: [ResourceEventType](../ResourceEventType-typealias.md), [ResourceEventListener](../ResourceEventListener-typealias.md).
