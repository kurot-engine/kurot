# addChild

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
addChild(child: DisplayObject): DisplayObject;
```

Parents a child at the top of this container's list and returns it.
Automatically detaches it from its previous parent. Re-adding an existing
child moves it to the top; listeners and resources stay owned by the child/view.

Related types: [DisplayObject](../DisplayObject-class.md).
