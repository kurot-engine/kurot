# width

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get width(): number;
set width(value: number);
```

Text layout width in logical units. Initially measured automatically;
NaN restores automatic measurement. A finite width constrains wrapping only
when multiline permits it; it does not set scaleX.

Unscaled logical width: measured content unless explicitly assigned.
NaN restores automatic measurement. Base assignment records an explicit size;
subclasses such as Bitmap, TextField and UI define how that size affects drawing.
