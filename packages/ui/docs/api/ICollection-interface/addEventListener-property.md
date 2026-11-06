# addEventListener

Package: `@kurot/ui@5.0.0`. Generated from public declarations and JSDoc.

```ts
addEventListener: { (type: K, listener: (event: ICollectionEvents<T>[K]) => void, useCapture?: boolean, priority?: number): void; (type: string, listener: (event: Event) => void, useCapture?: boolean, priority?: number): void };
```

Observes typed collection mutations; other event names retain Core semantics.
