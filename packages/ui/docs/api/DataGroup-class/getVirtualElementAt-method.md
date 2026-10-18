# getVirtualElementAt

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
getVirtualElementAt(index: number): DisplayObject | undefined;
```

Return or materialize/recycle a renderer for a logical item index. Integer-
coerces the index; returns undefined without a provider or when out of bounds.
Renderer construction and data callbacks run synchronously and may throw.

Related types: [DisplayObject](../../../../core/docs/api/DisplayObject-class.md).
