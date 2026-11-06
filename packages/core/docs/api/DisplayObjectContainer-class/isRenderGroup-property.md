# isRenderGroup

Package: `@kurot/core@3.1.0`. Generated from public declarations and JSDoc.

```ts
isRenderGroup: boolean;
```

Whether WebGL isolates this subtree in its own reusable InstructionSet,
false by default. This limits structural rebuilds across group boundaries;
children still update normally. It does not rasterize or freeze the subtree
and has no visual effect on the Canvas rendering path.

**Default/initializer:** `false`
