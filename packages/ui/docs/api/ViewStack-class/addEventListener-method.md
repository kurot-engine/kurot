# addEventListener

Package: `@kurot/ui@5.1.2`. Generated from public declarations and JSDoc.

```ts
addEventListener<K extends string>(type: K, listener: (event: GroupEvents<unknown>[K]) => void, useCapture?: boolean, priority?: number): void;
addEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean, priority?: number): void;
```

Inherited from `addEventListener`; shown with this receiver's substituted types.

Observes typed collection mutations; other event names retain Core semantics.

Registers a listener on this node. ENTER_FRAME and RENDER also register it
with the shared ticker, including while detached; remove those listeners
explicitly when their owning view is released.

Registers a custom event listener with the same capture and priority rules.
