# skinParts

Package: `@kurot/ui@5.3.0`. Generated from public declarations and JSDoc.

```ts
get skinParts(): Readonly<SkinPartsOf<TSkin>>;
```

Read-only named parts exported by the attached skin. Access before completed
skin attachment throws Error; use onSkinReady() to access the full part set.
Old parts remain available inside onSkinRemoved(), before detachment. Generated
declarations provide exact names/types for known skins.
Frameworks can enumerate this view; ordinary application code declares and
accesses the corresponding host fields directly.

Related types: [SkinPartsOf](../SkinPartsOf-typealias.md).
