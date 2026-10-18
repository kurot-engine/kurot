# destroy

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
destroy(name: string): boolean;
```

Destroy a single cached resource by name.
Returns false if no analyzer owns that cached entry. This does not cancel
an in-flight request; a later completion may populate the cache again.
Callers sharing the entry must coordinate ownership before destroying it.
