# height

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get height(): number;
set height(value: number);
```

Logical layout height, automatically measured until assigned. NaN restores
automatic height. Negative/non-finite values other than NaN throw RangeError;
verticalAlign positions the bitmap-font line block in this frame.

Unscaled logical height: measured content unless explicitly assigned.
NaN restores automatic measurement; changing this value does not change scaleY.
Subclasses define how an explicit height constrains or draws their content.
