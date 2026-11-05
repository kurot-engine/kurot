# skinName

Package: `@kurot/ui@4.2.0`. Generated from public declarations and JSDoc.

```ts
get skinName(): string | Skin | (() => Skin) | undefined;
set skinName(value: string | Skin | (() => Skin) | undefined);
```

Skin constructor, instance or class-name string, initially undefined. Names
resolve in the node's UIContext when present, otherwise in the global registry.
A missing name clears the attached skin rather than throwing; exceptions
from a supplied factory propagate. Assigning undefined detaches the skin.
Replacement invokes skin cleanup hooks, but stage removal alone retains the skin.
Part-name/type preflight failures leave the attached skin and name unchanged.

Related types: [Skin](../Skin-class.md).
