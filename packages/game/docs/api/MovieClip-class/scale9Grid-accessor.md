# scale9Grid

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
get scale9Grid(): Rectangle | undefined;
set scale9Grid(value: Rectangle | undefined);
```

Inherited from `Bitmap.scale9Grid`; shown with this receiver's substituted types.

Optional nine-slice rectangle in logical texture coordinates, initially
undefined. It is retained by reference; reassign after editing to invalidate
render data. Has an effect only when fillMode is 'scale'.

Related types: [Rectangle](../../../../core/docs/api/Rectangle-class.md).
