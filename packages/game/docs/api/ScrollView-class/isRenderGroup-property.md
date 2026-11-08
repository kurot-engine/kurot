# isRenderGroup

Package: `@kurot/game@3.0.1`. Generated from public declarations and JSDoc.

```ts
isRenderGroup: boolean;
```

Inherited from `Sprite.isRenderGroup`; shown with this receiver's substituted types.

Whether WebGL isolates this subtree in its own reusable InstructionSet,
false by default. This limits structural rebuilds across group boundaries;
children still update normally. It does not rasterize or freeze the subtree
and has no visual effect on the Canvas rendering path.

**Default/initializer:** `false`
