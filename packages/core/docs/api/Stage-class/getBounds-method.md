# getBounds

Package: `@kurot/core@2.6.0`. Generated from public declarations and JSDoc.

```ts
getBounds(resultRect?: Rectangle, calculateAnchor: boolean): Rectangle;
```

Inherited from `getBounds`; shown with this receiver's substituted types.

Returns local logical content bounds, optionally writing into resultRect.
calculateAnchor defaults to true and subtracts anchor offsets. Omit the
result rectangle to allocate one; bounds do not include the parent's transform.

**Default calculateAnchor:** `true`

Related types: [Rectangle](../Rectangle-class.md).
