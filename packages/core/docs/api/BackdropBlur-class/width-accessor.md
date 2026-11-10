# width

Package: `@kurot/core@3.4.0`. Generated from public declarations and JSDoc.

```ts
get width(): number;
set width(value: number);
```

Finite non-negative local effect width. Resizing does not change scaleX.

Unscaled logical width: measured content unless explicitly assigned.
NaN restores automatic measurement. Base assignment records an explicit size;
subclasses such as Bitmap, TextField and UI define how that size affects drawing.
