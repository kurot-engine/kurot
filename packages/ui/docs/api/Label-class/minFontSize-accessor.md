# minFontSize

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get minFontSize(): number;
set minFontSize(value: number);
```

Lower shrink-fitting limit in logical pixels; defaults to 12. Must be finite
and at least 1 or throws RangeError. A limit above size does not enlarge text.
