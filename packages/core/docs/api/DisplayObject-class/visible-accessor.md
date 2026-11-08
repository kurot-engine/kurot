# visible

Package: `@kurot/core@3.2.3`. Generated from public declarations and JSDoc.

```ts
get visible(): boolean;
set visible(value: boolean);
```

Whether this node/subtree participates in drawing and normal hit testing;
true by default. Hiding does not stop ticker callbacks, timers or Tweens.
