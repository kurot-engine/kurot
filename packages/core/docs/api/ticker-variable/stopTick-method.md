# stopTick

Package: `@kurot/core@3.2.2`. Generated from public declarations and JSDoc.

```ts
stopTick(callback: TickCallback): void;
```

Detaches the exact function passed to startTick(). A missing callback is
harmless; a newly bound callback is a different identity. Removal during
an update takes effect on the next callback snapshot.

Related types: [TickCallback](../supporting/core-TickCallback.md).
