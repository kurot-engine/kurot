# height

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
get height(): number;
set height(value: number);
```

Inherited from `height`; shown with this receiver's substituted types.

Unscaled logical height: measured content unless explicitly assigned.
NaN restores automatic measurement; changing this value does not change scaleY.
Subclasses define how an explicit height constrains or draws their content.
