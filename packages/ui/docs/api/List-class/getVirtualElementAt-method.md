# getVirtualElementAt

Package: `@kurot/ui@5.3.0`. Generated from public declarations and JSDoc.

```ts
getVirtualElementAt(index: number): ItemRenderer<string, T> | undefined;
```

Return or materialize/recycle a renderer for a logical item index. Integer-
coerces the index; returns undefined without a provider or when out of bounds.
Renderer construction and data callbacks run synchronously and may throw.

Related types: [ItemRenderer](../ItemRenderer-class.md).
