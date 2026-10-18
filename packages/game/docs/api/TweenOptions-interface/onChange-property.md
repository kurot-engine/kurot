# onChange

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
onChange?: (tween: Tween) => void;
```

Optional callback after each tween update, including the final update.
Called synchronously with the Tween argument; exceptions propagate to the caller
or ticker. Stop/remove the tween to end future callbacks during game disposal.
