# width

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get width(): number;
set width(value: number);
```

Logical layout width, automatically measured until assigned. NaN restores
automatic width. Negative/non-finite values other than NaN throw RangeError;
a finite width constrains wrapping while multiline is enabled.

Unscaled logical width: measured content unless explicitly assigned.
NaN restores automatic measurement. Base assignment records an explicit size;
subclasses such as Bitmap, TextField and UI define how that size affects drawing.
