# callLater

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
callLater(fn: (args: unknown[]) => void, ...args: unknown[]): void;
```

Queues work for the next render preparation while a Player is registered.
This has no cancellation handle; guard callbacks owned by a disposed view.
