# height

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get height(): number;
set height(value: number);
```

Inherited from `height`; shown with this receiver's substituted types.

Current unscaled UI height in logical pixels. Explicit height starts as NaN
(automatic measurement); assigning NaN restores automatic sizing. Parent layout
constraints may allocate a different size. Reading can validate pending size.
