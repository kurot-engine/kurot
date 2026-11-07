# dispose

Package: `@kurot/core@3.2.2`. Generated from public declarations and JSDoc.

```ts
dispose(): void;
```

Disposes the underlying page texture. Child views are non-owning and
must no longer be rendered once the shared page source is released. The view
map is retained; this does not individually detach or dispose child views.
