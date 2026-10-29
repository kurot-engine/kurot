# stroke

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get stroke(): number;
set stroke(value: number);
```

Outline width in logical pixels, initially 0. Paint padding contains the
outline without increasing Core's nominal layout dimensions. Use a finite
non-negative width; assignment does not perform range validation.
