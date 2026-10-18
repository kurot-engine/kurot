# updateRenderer

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
updateRenderer(renderer: ItemRenderer, itemIndex: number, data: unknown): ItemRenderer;
```

Override updateRenderer to sync the renderer's `selected` state when it
is created/recycled (matching Egret's `itemSelected` call).

Related types: [ItemRenderer](../ItemRenderer-class.md).
