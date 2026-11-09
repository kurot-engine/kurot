# getElementAt

Package: `@kurot/ui@5.1.4`. Generated from public declarations and JSDoc.

```ts
getElementAt(index: number): ItemRenderer<string, T> | undefined;
```

Return an already materialized renderer for a 0-based logical item index.
Returns undefined for absent/offscreen items; does not create a renderer.

Related types: [ItemRenderer](../ItemRenderer-class.md).
