# replaceItemAt

Package: `@kurot/ui@5.1.5`. Generated from public declarations and JSDoc.

```ts
replaceItemAt(item: T, index: number): T | undefined;
```

Replace an item, return the previous item and dispatch REPLACE. Neither item
is disposed. Pass an integer index within 0..length-1; bounds violations throw
RangeError, without separate integer validation.
