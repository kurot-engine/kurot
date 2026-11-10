# abort

Package: `@kurot/core@3.6.0`. Generated from public declarations and JSDoc.

```ts
abort(): void;
```

Ends the current batch. In-flight analyzers may settle, but their results
cannot advance, retry or notify a later batch.
