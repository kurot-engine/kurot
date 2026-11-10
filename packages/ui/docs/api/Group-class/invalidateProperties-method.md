# invalidateProperties

Package: `@kurot/ui@5.3.0`. Generated from public declarations and JSDoc.

```ts
invalidateProperties(): void;
```

Queue a deferred commitProperties() pass. Repeated invalidations coalesce;
this does not synchronously commit or schedule application game logic.
