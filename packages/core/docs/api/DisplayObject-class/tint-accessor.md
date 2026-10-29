# tint

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get tint(): number;
set tint(value: number);
```

Multiplicative RGB color, initially 0xffffff (white). Values outside
[0, 0xffffff] or non-numeric values reset to white; this does not set alpha.
