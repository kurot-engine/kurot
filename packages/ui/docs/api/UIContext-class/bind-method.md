# bind

Package: `@kurot/ui@3.7.1`. Generated from public declarations and JSDoc.

```ts
bind(root: DisplayObject): void;
```

Binds a root before attachment and synchronizes automatic radio groups in
its subtree. Captured descendants retain their own contexts. Existing Skin
or asset work performed outside a context is not undone by binding.
Rebinding the same owner is allowed; a different captured owner or a disposed
context throws. Uncaptured descendants inherit through their parent chain.

Related types: [DisplayObject](../../../../core/docs/api/DisplayObject-class.md).
