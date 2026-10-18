# width

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get width(): number;
set width(v: number);
```

Inherited from `width`; shown with this receiver's substituted types.

Current unscaled UI width in logical pixels. Explicit width starts as NaN
(automatic measurement); assigning NaN restores automatic sizing. Parent layout
constraints may allocate a different size. Reading can validate pending size.

Unscaled logical width: measured content unless explicitly assigned.
NaN restores automatic measurement. Base assignment records an explicit size;
subclasses such as Bitmap, TextField and UI define how that size affects drawing.
