# skinName

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get skinName(): string | Skin | (() => Skin) | undefined;
set skinName(value: string | Skin | (() => Skin) | undefined);
```

Inherited from `skinName`; shown with this receiver's substituted types.

Skin constructor, instance or global class-name string, initially undefined.
A missing global name clears the attached skin rather than throwing; exceptions
from a supplied factory propagate. Assigning undefined detaches the skin.
Replacement invokes skin cleanup hooks, but stage removal alone retains the skin.

Related types: [Skin](../Skin-class.md).
