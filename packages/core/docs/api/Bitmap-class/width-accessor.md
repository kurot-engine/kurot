# width

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get width(): number;
set width(value: number);
```

Drawn width in unscaled logical units, initially the texture frame width.
NaN restores automatic width; negative values are ignored. This resizes the
bitmap's fill region without changing scaleX.

Unscaled logical width: measured content unless explicitly assigned.
NaN restores automatic measurement. Base assignment records an explicit size;
subclasses such as Bitmap, TextField and UI define how that size affects drawing.
