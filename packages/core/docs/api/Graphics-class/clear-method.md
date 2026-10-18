# clear

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
clear(): void;
```

Clears retained drawing commands, bounds and the Canvas cache dimensions.
Call before redrawing replacement geometry. This does not remove the owning
Shape/Sprite or dispose unrelated textures, listeners or callbacks.
