# throwSpeed

Package: `@kurot/ui@4.1.0`. Generated from public declarations and JSDoc.

```ts
get throwSpeed(): number;
set throwSpeed(val: number);
```

Throw/inertia multiplier for both axes; defaults to 1. Negative values clamp
to 0; non-finite values are not rejected. Prefer this setter over scrollFactor.
