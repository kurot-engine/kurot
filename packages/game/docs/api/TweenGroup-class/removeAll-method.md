# removeAll

Package: `@kurot/game@3.0.0`. Generated from public declarations and JSDoc.

```ts
removeAll(): void;
```

Remove all tracked tweens and clear the group. Pending await/then completion
resolves even on removal; guard continuation code against an ended game round.
Tweens that are not tracked by this instance are unaffected.
