# enabled

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get enabled(): boolean;
set enabled(value: boolean);
```

Whether this component accepts input; defaults to true. Disabling immediately
suppresses touchEnabled/touchChildren and invalidates the skin state; re-enabling
restores requested flags. This does not stop game callbacks, timers or tweens.

Enable or disable this component (and its children).

Mirrors egret's `$setEnabled`: writes `touchEnabled` / `touchChildren`
directly at the display-object level (via `super`) so that:

1. The display-layer values change immediately (disabled components are
   skipped in hit-testing, just like egret).
2. `_explicitTouchEnabled` / `_explicitTouchChildren` survive the
   disable→enable cycle so the original intent is restored on re-enable.
