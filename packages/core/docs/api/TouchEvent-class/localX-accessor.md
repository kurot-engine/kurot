# localX

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get localX(): number;
```

Horizontal coordinate in the original event target's local logical space.
It is not automatically recomputed relative to each bubbling currentTarget;
use currentTarget.globalToLocal(stageX, stageY) for that listener's space.
