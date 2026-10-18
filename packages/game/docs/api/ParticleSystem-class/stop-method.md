# stop

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
stop(clear: boolean): void;
```

Stop new emissions. clear defaults to false, letting live particles expire
before the ticker callback is removed. With true, clears live particles and
unregisters the callback immediately. Use stop(true) when closing a game round;
borrowed textures and application event listeners are not disposed.

**Default clear:** `false`
