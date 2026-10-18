# repeat

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
repeat?: number;
```

Additional cycles after the first; defaults to 0, or -1 when loop is true.
Exactly -1 repeats forever. Other finite values are floored and clamped to 0;
non-finite values become 0. Counts are cycles, not milliseconds.
