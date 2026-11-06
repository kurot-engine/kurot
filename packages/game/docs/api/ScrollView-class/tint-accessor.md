# tint

Package: `@kurot/game@3.0.0`. Generated from public declarations and JSDoc.

```ts
get tint(): number;
set tint(value: number);
```

Inherited from `Sprite.tint`; shown with this receiver's substituted types.

Multiplicative RGB color, initially 0xffffff (white). Values outside
[0, 0xffffff] or non-numeric values reset to white; this does not set alpha.
