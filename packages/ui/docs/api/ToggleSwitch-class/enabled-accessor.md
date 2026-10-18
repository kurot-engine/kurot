# enabled

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get enabled(): boolean;
set enabled(value: boolean);
```

Inherited from `enabled`; shown with this receiver's substituted types.

Whether this component accepts input; defaults to true. Disabling immediately
suppresses touchEnabled/touchChildren and invalidates the skin state; re-enabling
restores requested flags. This does not stop game callbacks, timers or tweens.
