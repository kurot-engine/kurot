# restrict

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get restrict(): string | undefined;
set restrict(value: string | undefined);
```

Optional allowed/excluded input character-set expression, initially
undefined. A first unescaped '^' separates allowed and excluded portions;
undefined clears both. Applies to browser editing, not arbitrary text assignment.
