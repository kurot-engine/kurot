# scrollRect

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get scrollRect(): Rectangle | undefined;
set scrollRect(value: Rectangle | undefined);
```

Inherited from `scrollRect`; shown with this receiver's substituted types.

Optional logical viewport. Its width/height clip at local (0, 0), while x/y
scroll content. Assignment copies the rectangle; reassign after editing it.
Assign undefined to clear the viewport.

Related types: [Rectangle](../../../../core/docs/api/Rectangle-class.md).
