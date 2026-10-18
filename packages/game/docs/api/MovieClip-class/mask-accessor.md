# mask

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
get mask(): Rectangle | DisplayObject | undefined;
set mask(value: Rectangle | DisplayObject | undefined);
```

Inherited from `Bitmap.mask`; shown with this receiver's substituted types.

Optional DisplayObject or logical Rectangle clipping mask, initially
undefined. Assign undefined to detach it. A display mask is shared by at most
one masked object; assigning it elsewhere transfers that mask association.

Related types: [Rectangle](../../../../core/docs/api/Rectangle-class.md), [DisplayObject](../../../../core/docs/api/DisplayObject-class.md).
