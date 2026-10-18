# markStructureDirty

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
markStructureDirty(owner?: DisplayObjectContainer): void;
```

Call this when the scene graph structure changes (child added/removed,
visibility toggled, filter added, etc.) to trigger a full rebuild next frame.

If `owner` is provided and is a RenderGroup, only that group's set is
marked dirty — the parent set is left untouched.

Related types: [DisplayObjectContainer](../DisplayObjectContainer-class.md).
