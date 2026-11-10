# removeEventListener

Package: `@kurot/ui@5.3.0`. Generated from public declarations and JSDoc.

```ts
removeEventListener: { (type: K, listener: (event: ICollectionEvents<T>[K]) => void, useCapture?: boolean): void; (type: string, listener: (event: Event) => void, useCapture?: boolean): void };
```

Removes the matching listener and capture phase without dispatching events.
