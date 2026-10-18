# ArrayCollection

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
class ArrayCollection extends EventDispatcher<ArrayCollectionEvents> implements ICollection
```

A wrapper around a plain `unknown[]` that implements [ICollection](ICollection-interface.md).

Dispatches [CollectionEvent.COLLECTION_CHANGE](CollectionEvent-class/static-COLLECTION_CHANGE-property.md) whenever items are
added, removed, replaced, or the entire source is reset — allowing
data-driven components (DataGroup, List, TabBar…) to update efficiently.

**defaultProperty**

source

Related types: [EventDispatcher](../../../core/docs/api/EventDispatcher-class.md), [ArrayCollectionEvents](supporting/ui-ArrayCollectionEvents.md), [ICollection](ICollection-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](ArrayCollection-class/constructor-constructor.md) |
| `length` | public | [open](ArrayCollection-class/length-accessor.md) |
| `source` | public | [open](ArrayCollection-class/source-accessor.md) |
| `addEventListener` | public, inherited | [open](ArrayCollection-class/addEventListener-method.md) |
| `addItem` | public | [open](ArrayCollection-class/addItem-method.md) |
| `addItemAt` | public | [open](ArrayCollection-class/addItemAt-method.md) |
| `dispatchEvent` | public, inherited | [open](ArrayCollection-class/dispatchEvent-method.md) |
| `dispatchEventWith` | public, inherited | [open](ArrayCollection-class/dispatchEventWith-method.md) |
| `filterFunction` | public | [open](ArrayCollection-class/filterFunction-method.md) |
| `getItemAt` | public | [open](ArrayCollection-class/getItemAt-method.md) |
| `getItemIndex` | public | [open](ArrayCollection-class/getItemIndex-method.md) |
| `hasEventListener` | public, inherited | [open](ArrayCollection-class/hasEventListener-method.md) |
| `itemUpdated` | public | [open](ArrayCollection-class/itemUpdated-method.md) |
| `notifyListener` | protected, inherited | [open](ArrayCollection-class/notifyListener-method.md) |
| `once` | public, inherited | [open](ArrayCollection-class/once-method.md) |
| `refresh` | public | [open](ArrayCollection-class/refresh-method.md) |
| `removeAll` | public | [open](ArrayCollection-class/removeAll-method.md) |
| `removeEventListener` | public, inherited | [open](ArrayCollection-class/removeEventListener-method.md) |
| `removeItemAt` | public | [open](ArrayCollection-class/removeItemAt-method.md) |
| `replaceAll` | public | [open](ArrayCollection-class/replaceAll-method.md) |
| `replaceItemAt` | public | [open](ArrayCollection-class/replaceItemAt-method.md) |
| `sort` | public | [open](ArrayCollection-class/sort-method.md) |
| `sortOn` | public | [open](ArrayCollection-class/sortOn-method.md) |
| `willTrigger` | public, inherited | [open](ArrayCollection-class/willTrigger-method.md) |
