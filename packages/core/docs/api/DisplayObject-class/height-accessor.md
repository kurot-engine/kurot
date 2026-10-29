# height

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get height(): number;
set height(value: number);
```

Unscaled logical height: measured content unless explicitly assigned.
NaN restores automatic measurement; changing this value does not change scaleY.
Subclasses define how an explicit height constrains or draws their content.
