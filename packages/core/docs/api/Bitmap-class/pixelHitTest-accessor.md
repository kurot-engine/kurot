# pixelHitTest

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get pixelHitTest(): boolean;
set pixelHitTest(value: boolean);
```

Whether bitmap hit testing consults the installed pixel-test callback;
false by default. With no callback, bounds hits remain accepted. This does
not enable touchEnabled by itself.
