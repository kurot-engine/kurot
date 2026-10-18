# height

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get height(): number;
set height(value: number);
```

Text viewport height in logical units. Initially measured automatically;
NaN restores automatic measurement. A finite height can clip/scroll rendered
lines, while textHeight describes text content rather than this viewport.

Unscaled logical height: measured content unless explicitly assigned.
NaN restores automatic measurement; changing this value does not change scaleY.
Subclasses define how an explicit height constrains or draws their content.
