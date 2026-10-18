# setPart

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
setPart(name: string, value: DisplayObject): void;
```

Set a skin part by name. Write-side counterpart to [getPart](getPart-method.md),
used by programmatic materializers to install parts whose names come
from authored data and therefore cannot be declared as class fields.
Rejects a name that conflicts with an existing runtime member. Listing
the name in skinParts and including visuals in elementsContent are
separate authoring responsibilities; this method does not parent objects.

Related types: [DisplayObject](../../../../core/docs/api/DisplayObject-class.md).
