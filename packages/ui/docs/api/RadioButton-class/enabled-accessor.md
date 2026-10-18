# enabled

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get enabled(): boolean;
set enabled(value: boolean);
```

Enabled only when both the radio button and its group are enabled.

Whether this component accepts input; defaults to true. Disabling immediately
suppresses touchEnabled/touchChildren and invalidates the skin state; re-enabling
restores requested flags. This does not stop game callbacks, timers or tweens.
