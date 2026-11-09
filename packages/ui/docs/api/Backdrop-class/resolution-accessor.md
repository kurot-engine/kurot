# resolution

Package: `@kurot/ui@5.2.2`. Generated from public declarations and JSDoc.

```ts
get resolution(): number | undefined;
set resolution(value: number | undefined);
```

Positive optional pixels-per-local-unit cap. Undefined inherits the target
density. Lower values reduce work/detail without changing layout dimensions.
