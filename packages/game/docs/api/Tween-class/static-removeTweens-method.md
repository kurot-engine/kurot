# static removeTweens

Package: `@kurot/game@3.0.0`. Generated from public declarations and JSDoc.

```ts
static removeTweens(target: object): void;
```

Removes every tween targeting an object.
Includes paused Tweens. Pending then()/await completion resolves even
when removed, so guard post-await game logic against a disposed round.
