import { Event, TouchEvent, EventDispatcher } from '@kurot/core';
import {
	ArrayCollection,
	CollectionEvent,
	ComboBox,
	DataGroup,
	Group,
	ItemRenderer,
	ItemTapEvent,
	Label,
	List,
	ListBase,
	PropertyEvent,
	TabBar,
	ViewStack,
} from '../../src/index.js';
import type { ICollection, IItemRenderer, GroupEvents } from '../../src/index.js';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
function exact<T extends true>(_value: T): void {}
interface ItemData {
	id: number;
}
const data: ItemData = { id: 1 };
const inferred = new ArrayCollection([data]);
exact<Equal<typeof inferred.source, ItemData[]>>(true);
exact<Equal<ReturnType<typeof inferred.getItemAt>, ItemData | undefined>>(true);
exact<Equal<ReturnType<typeof inferred.removeItemAt>, ItemData | undefined>>(true);
exact<Equal<ReturnType<typeof inferred.replaceItemAt>, ItemData | undefined>>(true);
inferred.sort((a, b) => a.id - b.id);
inferred.filterFunction(item => item.id > 0);
inferred.addItem(data);
inferred.getItemIndex(undefined);

const nullable = new ArrayCollection([data, null]);
exact<Equal<typeof nullable.source, (ItemData | null)[]>>(true);
const provider: ICollection<ItemData | null> = nullable;
const list = new List<ItemData | null>();
list.dataProvider = provider;
list.selectedItem = null;
list.selectedItem = undefined;
exact<Equal<List<ItemData | null>['selectedItem'], ItemData | null | undefined>>(true);
exact<Equal<ReturnType<NonNullable<typeof list.dataProvider>['getItemAt']>, ItemData | null | undefined>>(true);
list.addEventListener(ItemTapEvent.ITEM_TAP, event => {
	exact<Equal<typeof event.item, ItemData | null | undefined>>(true);
	exact<Equal<typeof event.itemRenderer, ItemRenderer<string, ItemData | null> | undefined>>(true);
	if (event.item != null) {
		event.item.id.toFixed();
	}
});
list.once('itemTap', event => {
	exact<Equal<typeof event.item, ItemData | null | undefined>>(true);
});
const tapped = (event: ItemTapEvent<ItemData | null>): void => {
	event.item?.id.toFixed();
};
list.addEventListener('itemTap', tapped);
list.removeEventListener('itemTap', tapped);
list.removeEventListener('itemTap', event => {
	event.item?.id.toFixed();
});
const mapped: GroupEvents<ItemData | null>['itemTap'] = new ItemTapEvent<ItemData | null>('itemTap');
exact<Equal<typeof mapped.item, ItemData | null | undefined>>(true);
provider.addEventListener(CollectionEvent.COLLECTION_CHANGE, event => {
	exact<Equal<typeof event.items, (ItemData | null | undefined)[]>>(true);
});
nullable.once(CollectionEvent.COLLECTION_CHANGE, event => {
	event.items[0]?.id.toFixed();
});
list.addEventListener(PropertyEvent.PROPERTY_CHANGE, event => event.property.toUpperCase());
list.once(PropertyEvent.PROPERTY_CHANGE, event => event.property.toUpperCase());
list.addEventListener(TouchEvent.TOUCH_TAP, event => event.stageX.toFixed());
list.addEventListener(Event.CHANGING, event => event.preventDefault());
list.once('custom-event', event => event.preventDefault());

const group = new DataGroup<ItemData | null>();
group.dataProvider = nullable;
group.itemRendererFunction = item => {
	item?.id.toFixed();
	return undefined;
};
const renderer = group.getVirtualElementAt(0);
exact<Equal<typeof renderer, ItemRenderer<string, ItemData | null> | undefined>>(true);
renderer?.data?.id.toFixed();
const base = new ListBase<ItemData | null>();
base.dataProvider = nullable;
const tabs = new TabBar<ItemData | null>();
tabs.dataProvider = nullable;
tabs.once('itemTap', event => event.item?.id.toFixed());
const viewTabs = new TabBar<string>();
viewTabs.dataProvider = new ViewStack();
const combo = new ComboBox<ItemData | null>();
combo.dataProvider = nullable;
combo.selectedItem = null;
combo.selectedItem = undefined;
combo.labelFunction = item => String(item?.id);
exact<Equal<ComboBox<ItemData | null>['selectedItem'], ItemData | null | undefined>>(true);
combo.list?.once('itemTap', event => event.item?.id.toFixed());

// Existing unspecialized calls still accept arbitrary values.
const legacy = new ArrayCollection();
legacy.addItem(1);
legacy.addItem(null);
legacy.addItem('text');
exact<Equal<ReturnType<typeof legacy.getItemAt>, unknown>>(true);
const oldList: List = new List();
oldList.dataProvider = new ArrayCollection([1, 'two', null]);
oldList.selectedItem = { arbitrary: true };
oldList.addEventListener('itemTap', event => {
	exact<Equal<typeof event.item, unknown>>(true);
});
const groupOwner: Group = list;

// The existing first ItemRenderer parameter remains the Skin name.
declare module '../../src/kurot/components/Component.js' {
	interface SkinPartsMap {
		'test.RowSkin': { title: Label };
	}
}
class LegacySkinRow extends ItemRenderer<'test.RowSkin'> {
	public titleText(): string {
		return this.skinParts.title.text;
	}
}
class TypedSkinRow extends ItemRenderer<'test.RowSkin', ItemData | null> {
	public titleText(): string {
		return this.skinParts.title.text + this.data?.id;
	}
}
const typedRow: IItemRenderer<ItemData | null> = new TypedSkinRow();
typedRow.data = null;
group.itemRenderer = TypedSkinRow;
oldList.itemRenderer = LegacySkinRow;

class LegacyProvider extends EventDispatcher implements ICollection {
	public readonly length = 1;
	public getItemAt(_index: number): unknown {
		return 'legacy';
	}
	public getItemIndex(_item: unknown): number {
		return 0;
	}
}
oldList.dataProvider = new LegacyProvider();

const legacyEmpty = new ArrayCollection([]);
legacyEmpty.addItem(data);
legacyEmpty.addItem(null);
exact<Equal<ReturnType<typeof legacyEmpty.getItemAt>, unknown>>(true);
const typedEmpty = new ArrayCollection<ItemData>([]);
typedEmpty.addItem(data);
exact<Equal<typeof typedEmpty.source, ItemData[]>>(true);
