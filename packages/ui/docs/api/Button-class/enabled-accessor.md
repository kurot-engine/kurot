# enabled

Package: `@kurot/ui@5.1.5`. Generated from public declarations and JSDoc.

```ts
get enabled(): boolean;
set enabled(value: boolean);
```

Whether this component accepts input; defaults to true. Disabling immediately
suppresses touchEnabled/touchChildren and invalidates the skin state; re-enabling
restores requested flags. This does not stop game callbacks, timers or tweens.
