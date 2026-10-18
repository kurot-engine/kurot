# start

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
start(): void;
```

Registers the timer with the shared ticker; repeated starts are harmless.
Preserves currentCount and restarts the elapsed interval. Does not independently
start requestAnimationFrame; the owning application must run the ticker.
