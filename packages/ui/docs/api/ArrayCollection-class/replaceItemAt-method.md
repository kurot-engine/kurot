# replaceItemAt

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
replaceItemAt(item: unknown, index: number): unknown;
```

Replace an item, return the previous item and dispatch REPLACE. Neither item
is disposed. Pass an integer index within 0..length-1; bounds violations throw
RangeError, without separate integer validation.
