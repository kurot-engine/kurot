# Typed list data

Available in UI 4.2.x and 5.x. Declared typed list fields in KUI hosts also
require CLI >= 4.1.1 within 4.x; ordinary TypeScript use needs only UI.
UI 5.2.1 requires Core ^3.2.1. List data types do not change resource or KUI formats.

## Collections and selection

```ts
import { ArrayCollection, ItemTapEvent, List } from '@kurot/ui';

interface ItemData { id: number; title: string; }
const first: ItemData = { id: 1, title: 'Forest' };
const data = new ArrayCollection([first, null]); // ArrayCollection<ItemData | null>
const list = new List<ItemData | null>();
list.dataProvider = data;
list.selectedItem = null;
list.addEventListener(ItemTapEvent.ITEM_TAP, event => {
    if (event.item != null) {
        console.log(event.item.id, event.item.title);
    }
});
```

ICollection<T>, ArrayCollection<T>, DataGroup<T>, ListBase<T>, List<T>,
TabBar<T> and ComboBox<T> default to unknown. ArrayCollection infers T from a
supplied array. Omitted source and an untyped empty array keep unknown; use
`new ArrayCollection<ItemData>()` or `new ArrayCollection<ItemData>([])` to type
an initially empty provider. Mutations, source replacement, sorting and filtering
retain the chosen item type. Assigning a provider does not infer or change a
previously constructed List's generic argument; specify it on the List.

getItemAt(), selectedItem and renderer data include undefined. Stored null values
remain null when T includes null. Sparse array slots and out-of-range reads remain
undefined, and no selection/provider remains undefined. selectedIndex distinguishes
a selected empty slot from no selection. getItemIndex(undefined) retains ordinary
array identity/indexOf behavior; holes are not converted into explicit items.

removeItemAt()/replaceItemAt() still throw for their existing bounds violations,
but their return type includes undefined because valid sparse slots can be empty.
No new integer validation, hole filling or null normalization is introduced.
Collection events preserve their item arrays, including explicit undefined results.

## Renderers and events

ItemRenderer keeps its existing Skin argument first:

```ts
import { ItemRenderer } from '@kurot/ui';

interface ItemData { id: number; }
class Row extends ItemRenderer<'skins.RowSkin', ItemData | null> {
    public currentId(): number | undefined {
        return this.data?.id;
    }
}
```

IItemRenderer<T> follows the same data contract. Renderer constructors, resolver
callbacks and materialized renderer lookups retain T; resolver input can be
undefined for a sparse provider. Recycling keeps its previous lifecycle and
listener ownership. An ItemRenderer with no second argument still uses unknown.

ItemTapEvent<T> and GroupEvents<T> retain item data in addEventListener, once and
removeEventListener. Event item and optional renderer data include undefined,
including a freshly constructed event with no payload. Property, touch, selection
and custom Event callbacks keep their existing contracts. Listener refinements on
DataGroup are declaration-only; Core and Group event methods are unchanged.

List dispatches one `itemTap` when a touch begins and ends on the same rendered
item, even if its skin changes which child is hit. Scrolling, releasing on a
different row or outside the List, or recycling the pressed row cancels the tap.

TabBar retains ViewStack synchronization. ViewStack's collection data is its child
names (strings), including its existing empty-string fallback. ComboBox's selected
item and inner List carry T; its label callback keeps the existing nullish guard.

## Runtime preservation

Generic type parameters do not change collection mutations/events, selection
clamping/cancellation, renderer pooling or null/undefined values.
Type assertions do not validate external data at runtime;
validate application inputs at their existing boundary.
