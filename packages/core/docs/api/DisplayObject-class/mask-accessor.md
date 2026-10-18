# mask

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get mask(): Rectangle | DisplayObject | undefined;
set mask(value: Rectangle | DisplayObject | undefined);
```

Optional DisplayObject or logical Rectangle clipping mask, initially
undefined. Assign undefined to detach it. A display mask is shared by at most
one masked object; assigning it elsewhere transfers that mask association.

Related types: [Rectangle](../Rectangle-class.md), [DisplayObject](../DisplayObject-class.md).
