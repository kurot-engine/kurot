# position

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
position?: number;
```

Initial forward-sequence position in milliseconds; omitted means 0.
Applied on the first active update, rather than synchronously at construction.
Negative values clamp to 0; non-finite values throw RangeError.
