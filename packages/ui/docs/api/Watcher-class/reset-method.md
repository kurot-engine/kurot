# reset

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
reset(newHost: IEventDispatcher | undefined): void;
```

Detach old property-change subscriptions and point the chain at a new host.
Undefined detaches it. Does not immediately invoke the handler; unlike a plain
object, each defined host must implement the property-change dispatcher contract.

Related types: [IEventDispatcher](../../../../core/docs/api/IEventDispatcher-interface.md).
