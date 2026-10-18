# height

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get height(): number;
set height(v: number);
```

Current unscaled UI height in logical pixels. Explicit height starts as NaN
(automatic measurement); assigning NaN restores automatic sizing. Parent layout
constraints may allocate a different size. Reading can validate pending size.

Unscaled logical height: measured content unless explicitly assigned.
NaN restores automatic measurement; changing this value does not change scaleY.
Subclasses define how an explicit height constrains or draws their content.
