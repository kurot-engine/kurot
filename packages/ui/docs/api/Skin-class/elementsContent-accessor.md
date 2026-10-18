# elementsContent

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get elementsContent(): DisplayObject[];
set elementsContent(value: DisplayObject[]);
```

Visual child list, initially empty and retained by reference. Skin is not a
display object: Component parents these children during attachment. Assigning
this list alone does not reparent or dispose any objects.

Related types: [DisplayObject](../../../../core/docs/api/DisplayObject-class.md).
