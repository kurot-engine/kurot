# stroke

Package: `@kurot/ui@5.2.2`. Generated from public declarations and JSDoc.

```ts
get stroke(): number;
set stroke(value: number);
```

Outline width in logical pixels for runs without a stroke, initially zero.
Must be finite and nonnegative. Outlines retain Core's render-only padding;
they do not add Label's outline insets to RichLabel's measured layout.
