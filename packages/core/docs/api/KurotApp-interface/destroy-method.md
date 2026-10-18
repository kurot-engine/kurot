# destroy

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
destroy(): void;
```

Idempotently destroys the Player and detaches canvas input, sizing and
lifecycle bindings. Remove application-owned handlers, ticker callbacks
and Tweens separately; this does not dispose every resource in a scene.
