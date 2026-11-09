# addEventListener

Package: `@kurot/ui@5.1.3`. Generated from public declarations and JSDoc.

```ts
addEventListener<K extends string>(type: K, listener: (event: ArrayCollectionEvents<T>[K]) => void, useCapture?: boolean, priority?: number): void;
addEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean, priority?: number): void;
```

Inherited from `EventDispatcher.addEventListener`; shown with this receiver's substituted types.

Observes typed collection mutations; other event names retain Core semantics.

Adds a listener with this dispatcher as its event source. The same
function/capture pair is registered once; larger priorities run first.
Preserve the function identity to remove it when its owner is disposed.
