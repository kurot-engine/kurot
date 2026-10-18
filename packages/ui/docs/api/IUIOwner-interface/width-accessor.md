# width

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get width(): number;
set width(value: number);
```

Inherited from `DisplayObject.width`; shown with this receiver's substituted types.

Unscaled logical width: measured content unless explicitly assigned.
NaN restores automatic measurement. Base assignment records an explicit size;
subclasses such as Bitmap, TextField and UI define how that size affects drawing.
