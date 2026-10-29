# isRenderGroup

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
isRenderGroup: boolean;
```

Inherited from `isRenderGroup`; shown with this receiver's substituted types.

When true this container owns an independent InstructionSet.
The renderer will build and execute its subtree separately, so changes
inside this container never trigger a rebuild of the parent set.

Typical use: mark a static background layer or a rarely-changing UI panel
as a RenderGroup so the parent scene graph traversal skips it entirely.

**Default/initializer:** `false`
