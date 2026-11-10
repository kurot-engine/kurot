# verticalAlign

Package: `@kurot/core@3.5.1`. Generated from public declarations and JSDoc.

```ts
get verticalAlign(): "top" | "middle" | "bottom";
set verticalAlign(value: "top" | "middle" | "bottom");
```

Bitmap-font line-block alignment inside the logical height, initially
'middle'. Invalid values throw RangeError; glyph/line metrics come from the font.
