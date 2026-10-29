# scrollRect

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
get scrollRect(): Rectangle | undefined;
set scrollRect(value: Rectangle | undefined);
```

Optional logical viewport. Its width/height clip at local (0, 0), while x/y
scroll content. Assignment copies the rectangle; reassign after editing it.
Assign undefined to clear the viewport.

Related types: [Rectangle](../Rectangle-class.md).
