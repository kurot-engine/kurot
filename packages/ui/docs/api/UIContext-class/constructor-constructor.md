# constructor

Package: `@kurot/ui@5.1.4`. Generated from public declarations and JSDoc.

```ts
constructor(options: UIContextOptions);
```

Copies the local registry and borrows the supplied providers without loading
resources or changing the global Theme, asset adapter or default font.

**Parameter options:** Borrowed providers and local registry inputs. The context owns only its
copied factory/default maps; callers retain provider and font lifetimes.

Related types: [UIContext](../UIContext-class.md), [UIContextOptions](../UIContextOptions-interface.md).
