# stopTick

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
stopTick(callback: TickCallback, thisObject: unknown): void;
```

Detaches the exact callback/thisObject pair passed to startTick().
A missing pair is harmless; a newly bound callback is a different identity.

Related types: [TickCallback](../supporting/core-TickCallback.md).
