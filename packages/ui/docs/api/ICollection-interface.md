# ICollection

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
interface ICollection extends IEventDispatcher
```

Interface for collection data sources used by data-driven components
(DataGroup, List, TabBar, etc.).

Implementations dispatch [CollectionEvent.COLLECTION_CHANGE](CollectionEvent-class/static-COLLECTION_CHANGE-property.md) when
the underlying data changes so that views can update accordingly.

Related types: [IEventDispatcher](../../../core/docs/api/IEventDispatcher-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `length` | public | [open](ICollection-interface/length-property.md) |
| `addEventListener` | public, inherited | [open](ICollection-interface/addEventListener-method.md) |
| `dispatchEvent` | public, inherited | [open](ICollection-interface/dispatchEvent-method.md) |
| `getItemAt` | public | [open](ICollection-interface/getItemAt-method.md) |
| `getItemIndex` | public | [open](ICollection-interface/getItemIndex-method.md) |
| `hasEventListener` | public, inherited | [open](ICollection-interface/hasEventListener-method.md) |
| `once` | public, inherited | [open](ICollection-interface/once-method.md) |
| `removeEventListener` | public, inherited | [open](ICollection-interface/removeEventListener-method.md) |
| `willTrigger` | public, inherited | [open](ICollection-interface/willTrigger-method.md) |
