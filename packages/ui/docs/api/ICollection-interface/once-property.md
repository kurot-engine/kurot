# once

Package: `@kurot/ui@5.2.2`. Generated from public declarations and JSDoc.

```ts
once: { (type: K, listener: (event: ICollectionEvents<T>[K]) => void, useCapture?: boolean, priority?: number): void; (type: string, listener: (event: Event) => void, useCapture?: boolean, priority?: number): void };
```

Observes one mutation using Core's existing once-listener behavior.
