# onLoopComplete

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
onLoopComplete?: (tween: Tween) => void;
```

Optional synchronous callback after a cycle that will repeat, before the
next cycle. It does not run for the final finite cycle. Exceptions propagate.
