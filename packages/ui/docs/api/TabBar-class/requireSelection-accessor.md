# requireSelection

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get requireSelection(): boolean;
set requireSelection(value: boolean);
```

Inherited from `requireSelection`; shown with this receiver's substituted types.

Whether a nonempty provider must keep an item selected; defaults to false.
When enabled with no selection, selects index 0 on property commit if an item
exists. An empty provider can still have selectedIndex=-1.
