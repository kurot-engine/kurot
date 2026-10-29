# setSelection

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
setSelection(beginIndex: number, endIndex: number): void;
```

Sets selection anchor and active endpoint using UTF-16 offsets. Values are
clamped to the current text range and synchronized with the input controller;
reverse selections are preserved rather than sorted.
