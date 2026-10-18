# addItemAt

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
addItemAt(item: unknown, index: number): void;
```

Insert a borrowed item and dispatch ADD. Pass an integer index from 0 through
length (inclusive). Bounds below 0 or above length throw RangeError; there is
no separate integer validation.
