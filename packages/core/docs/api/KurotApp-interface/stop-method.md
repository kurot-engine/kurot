# stop

Package: `@kurot/core@3.5.0`. Generated from public declarations and JSDoc.

```ts
stop(): void;
```

Stops this Player without releasing input or lifecycle bindings. Continue
mode also stops its shared logic scheduler; start() excludes stopped time.
Application-owned ticker callbacks and Tweens require their own cleanup.
