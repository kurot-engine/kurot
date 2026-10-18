# getOrAssignSlot

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
getOrAssignSlot(texture: WebGLTexture): number;
```

Assign a slot to `texture`. Returns the slot index (0–7).
Returns -1 if all slots are full — caller must flush first.
