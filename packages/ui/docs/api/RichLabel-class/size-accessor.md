# size

Package: `@kurot/ui@5.2.3`. Generated from public declarations and JSDoc.

```ts
get size(): number;
set size(value: number);
```

Font size in logical pixels for runs without a size. Initially Core's
construction-time default (normally 30); must be finite and nonnegative.
An explicitly sized run retains its size, even if it equals this value.
