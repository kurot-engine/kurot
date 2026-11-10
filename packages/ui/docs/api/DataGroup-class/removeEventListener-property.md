# removeEventListener

Package: `@kurot/ui@5.2.3`. Generated from public declarations and JSDoc.

```ts
removeEventListener: { (type: K, listener: (event: GroupEvents<T>[K]) => void, useCapture?: boolean): void; (type: string, listener: (event: Event) => void, useCapture?: boolean): void };
```

Removes a typed listener through the inherited Group implementation.
