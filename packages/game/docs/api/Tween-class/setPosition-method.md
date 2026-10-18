# setPosition

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
setPosition(value: number): void;
```

Moves the sequence to an absolute position in its initial forward pass.
Seeking applies prior interpolations and `set` steps, but deliberately
skips `call` steps to avoid replaying arbitrary side effects.

**Parameter value:** Finite milliseconds from the start. Negative values clamp
to zero; seeking beyond the sequence releases the Tween.
