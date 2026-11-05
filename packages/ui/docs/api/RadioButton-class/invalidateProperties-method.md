# invalidateProperties

Package: `@kurot/ui@4.1.0`. Generated from public declarations and JSDoc.

```ts
invalidateProperties(): void;
```

Inherited from `invalidateProperties`; shown with this receiver's substituted types.

Queue a deferred commitProperties() pass. Repeated invalidations coalesce;
this does not synchronously commit or schedule application game logic.
