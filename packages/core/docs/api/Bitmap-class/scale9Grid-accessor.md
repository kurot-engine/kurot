# scale9Grid

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get scale9Grid(): Rectangle | undefined;
set scale9Grid(value: Rectangle | undefined);
```

Optional nine-slice rectangle in logical texture coordinates, initially
undefined. It is retained by reference; reassign after editing to invalidate
render data. Has an effect only when fillMode is 'scale'.

Related types: [Rectangle](../Rectangle-class.md).
