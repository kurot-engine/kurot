# zIndex

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get zIndex(): number;
set zIndex(value: number);
```

Relative sibling draw-order value, initially 0. Assignment marks the parent
for sorting; automatic sorting requires parent.sortableChildren = true.
