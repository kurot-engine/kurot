# onLoopComplete

Package: `@kurot/game@3.0.0`. Generated from public declarations and JSDoc.

```ts
onLoopComplete?: (tween: Tween) => void;
```

Optional synchronous callback after a cycle that will repeat, before the
next cycle. It does not run for the final finite cycle. Exceptions propagate.
Runs without a receiver, with the Tween supplied as its argument.
