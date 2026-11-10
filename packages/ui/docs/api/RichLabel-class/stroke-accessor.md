# stroke

Package: `@kurot/ui@5.3.0`. Generated from public declarations and JSDoc.

```ts
get stroke(): number;
set stroke(value: number);
```

Outline width in logical pixels for runs without a stroke, initially zero.
Must be finite and nonnegative. With outlineLayout=reserve-space, effective
run outlines also contribute to measurement and the inner content frame.
