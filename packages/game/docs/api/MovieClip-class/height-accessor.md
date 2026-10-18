# height

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
get height(): number;
set height(value: number);
```

Inherited from `Bitmap.height`; shown with this receiver's substituted types.

Drawn height in unscaled logical units, initially the texture frame height.
NaN restores automatic height; negative values are ignored. This resizes the
bitmap's fill region without changing scaleY.

Unscaled logical height: measured content unless explicitly assigned.
NaN restores automatic measurement; changing this value does not change scaleY.
Subclasses define how an explicit height constrains or draws their content.
