# width

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get width(): number;
set width(value: number);
```

Current unscaled UI width in logical pixels. Explicit width starts as NaN
(automatic measurement); assigning NaN restores automatic sizing. Parent layout
constraints may allocate a different size. Reading can validate pending size.
