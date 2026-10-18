# removeItemAt

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
removeItemAt(index: number): unknown;
```

Remove and return an item, dispatching REMOVE without disposing it. Pass an
integer index from 0 through length-1. Out-of-bounds values throw RangeError;
there is no separate integer validation.
