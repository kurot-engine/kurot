# updateRenderer

Package: `@kurot/ui@4.2.0`. Generated from public declarations and JSDoc.

```ts
updateRenderer(renderer: ItemRenderer<string, T>, itemIndex: number, data: T | undefined): ItemRenderer<string, T>;
```

Inherited from `updateRenderer`; shown with this receiver's substituted types.

Override updateRenderer to sync the renderer's `selected` state when it
is created/recycled (matching Egret's `itemSelected` call).

Related types: [ItemRenderer](../ItemRenderer-class.md).
