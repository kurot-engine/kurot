# ICollection

Package: `@kurot/ui@5.2.3`. Generated from public declarations and JSDoc.

```ts
interface ICollection<T = unknown> extends IEventDispatcher
```

Interface for collection data sources used by data-driven components
(DataGroup, List, TabBar, etc.).

Implementations dispatch [CollectionEvent.COLLECTION_CHANGE](CollectionEvent-class/static-COLLECTION_CHANGE-property.md) when
the underlying data changes so that views can update accordingly.

Related types: [IEventDispatcher](../../../core/docs/api/IEventDispatcher-interface.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `addEventListener` | public | [open](ICollection-interface/addEventListener-property.md) |
| `length` | public | [open](ICollection-interface/length-property.md) |
| `once` | public | [open](ICollection-interface/once-property.md) |
| `removeEventListener` | public | [open](ICollection-interface/removeEventListener-property.md) |
| `dispatchEvent` | public, inherited | [open](ICollection-interface/dispatchEvent-method.md) |
| `getItemAt` | public | [open](ICollection-interface/getItemAt-method.md) |
| `getItemIndex` | public | [open](ICollection-interface/getItemIndex-method.md) |
| `hasEventListener` | public, inherited | [open](ICollection-interface/hasEventListener-method.md) |
| `willTrigger` | public, inherited | [open](ICollection-interface/willTrigger-method.md) |
