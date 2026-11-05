# removeItemAt

Package: `@kurot/ui@4.2.0`. Generated from public declarations and JSDoc.

```ts
removeItemAt(index: number): T | undefined;
```

Remove and return an item, dispatching REMOVE without disposing it. Pass an
integer index from 0 through length-1. Out-of-bounds values throw RangeError;
there is no separate integer validation.
