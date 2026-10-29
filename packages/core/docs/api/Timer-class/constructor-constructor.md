# constructor

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
constructor(delay: number, repeatCount: number);
```

Creates a stopped timer. delay is milliseconds; values below 1 become 1.
repeatCount defaults to 0 (unlimited) and is integer-coerced on construction.
Timing depends on the shared ticker; missed intervals are not replayed in a burst.

**Default repeatCount:** `0`

Related types: [Timer](../Timer-class.md).
