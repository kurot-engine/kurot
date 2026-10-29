# abort

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
abort(): void;
```

Abort the active native request and clear this wrapper's response/status
access. Does not dispatch COMPLETE or remove application event listeners;
remove those separately on view disposal. Repeated calls are harmless.
