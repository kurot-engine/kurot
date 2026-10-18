# resolution

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get resolution(): number | undefined;
set resolution(value: number | undefined);
```

Physical pixels per logical unit for GPU effects. Undefined inherits the
parent resolution; a chain uses the minimum requested resolution.
