# maxChars

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get maxChars(): number;
set maxChars(value: number);
```

Maximum browser-editable length, initially 0 (unlimited). Input offsets and
lengths use UTF-16 code units, not grapheme counts. Programmatic text assignment
is not truncated by this property.
