# selectionBeginIndex

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get selectionBeginIndex(): number;
```

Selection anchor as a UTF-16 offset, initially 0. It can be greater than
selectionEndIndex for a reverse selection; it is not always the lower bound.
