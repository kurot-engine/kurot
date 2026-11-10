# height

Package: `@kurot/core@3.4.0`. Generated from public declarations and JSDoc.

```ts
get height(): number;
set height(value: number);
```

Finite non-negative local effect height. Resizing does not change scaleY.

Unscaled logical height: measured content unless explicitly assigned.
NaN restores automatic measurement; changing this value does not change scaleY.
Subclasses define how an explicit height constrains or draws their content.
