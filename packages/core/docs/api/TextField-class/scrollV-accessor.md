# scrollV

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get scrollV(): number;
set scrollV(value: number);
```

One-based index of the first visible row, initially 1. Reading/assignment
clamp to [1, maxScrollV]; this is a row index, not a pixel offset.
