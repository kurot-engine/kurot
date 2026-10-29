# lineSpacing

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get lineSpacing(): number;
set lineSpacing(value: number);
```

Extra logical pixels between rows, initially 0. Negative or non-finite
values throw RangeError; font-native row metrics remain in effect.
