# addEventListener

Package: `@kurot/ui@5.1.3`. Generated from public declarations and JSDoc.

```ts
addEventListener: { (type: K, listener: (event: GroupEvents<T>[K]) => void, useCapture?: boolean, priority?: number): void; (type: string, listener: (event: Event) => void, useCapture?: boolean, priority?: number): void };
```

Preserve native add/remove/once behavior while specializing list payloads.
