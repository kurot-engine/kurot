# invalidate

Package: `@kurot/core@3.4.0`. Generated from public declarations and JSDoc.

```ts
invalidate(): void;
```

Requests Event.RENDER dispatch on the next ticker frame. Repeated calls
before that frame coalesce through the shared invalidation flag.
