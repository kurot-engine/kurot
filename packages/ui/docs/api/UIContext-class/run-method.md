# run

Package: `@kurot/ui@5.1.0`. Generated from public declarations and JSDoc.

```ts
run<T>(create: () => T): T;
```

Scopes synchronous UI construction and restores the previous owner on exit,
including exceptions. Scope ends before any returned Promise settles.
Throws after disposal; captured nodes retain this context for their lifetime.
