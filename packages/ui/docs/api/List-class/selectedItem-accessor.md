# selectedItem

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get selectedItem(): unknown;
set selectedItem(value: unknown);
```

Inherited from `selectedItem`; shown with this receiver's substituted types.

Selected provider item, or undefined without selection/provider. Assignment
uses getItemIndex identity matching. Before a provider is available, stores a
pending item for the next property commit; no data object is copied or disposed.
