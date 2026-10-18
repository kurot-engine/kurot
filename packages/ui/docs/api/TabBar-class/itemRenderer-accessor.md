# itemRenderer

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
get itemRenderer(): (() => ItemRenderer) | undefined;
set itemRenderer(value: (() => ItemRenderer) | undefined);
```

Inherited from `itemRenderer`; shown with this receiver's substituted types.

Renderer constructor, initially undefined (fallback: ItemRenderer). The group
creates/recycles instances. Keep per-item listeners/resources in renderer hooks
so a recycled renderer does not retain the previous item's game state.
