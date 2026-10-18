# text

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get text(): string;
set text(value: string);
```

Plain content, initially ''. Assignment replaces rich text styling even
when the characters match an existing rich value. Programmatic assignment
is not constrained by maxChars/restrict in the same way as browser editing.
