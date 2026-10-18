# stop

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
stop(): void;
```

Cancels the requestAnimationFrame loop without clearing players, tick
callbacks, deferred calls or pause state. Registration owners must detach
their own callbacks; stop() alone does not dispose them.
