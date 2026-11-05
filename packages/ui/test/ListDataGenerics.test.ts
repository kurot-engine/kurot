import { describe, expect, it } from 'vitest';
import { Event, TouchEvent } from '@kurot/core';
import {
	ArrayCollection,
	CollectionEvent,
	ComboBox,
	ItemRenderer,
	ItemTapEvent,
	List,
	VerticalLayout,
} from '../src/index.js';

interface ItemData {
	id: number;
}
class Row extends ItemRenderer<string, ItemData | null> {
	public constructor() {
		super();
		this.width = 100;
		this.height = 20;
	}
}
class DataList extends List<ItemData | null> {
	public select(index: number): void {
		this.setSelectedIndex(index, true);
	}
}

function makeList(source: (ItemData | null)[]): DataList {
	const list = new DataList();
	list.itemRenderer = Row;
	list.dataProvider = new ArrayCollection(source);
	list.validateProperties();
	return list;
}

describe('typed list runtime preservation', () => {
	it('preserves null, sparse slots, missing indices and undefined mutation results', () => {
		const source = new Array<ItemData | null>(3);
		source[0] = { id: 1 };
		source[1] = null;
		const collection = new ArrayCollection(source);
		expect(collection.getItemAt(1)).toBeNull();
		expect(collection.getItemAt(2)).toBeUndefined();
		expect(collection.getItemAt(-1)).toBeUndefined();
		expect(collection.getItemAt(99)).toBeUndefined();
		expect(collection.getItemIndex(undefined)).toBe(-1);
		const removed: (ItemData | null | undefined)[] = [];
		collection.addEventListener(CollectionEvent.COLLECTION_CHANGE, event => removed.push(...event.items));
		expect(collection.removeItemAt(2)).toBeUndefined();
		expect(removed).toEqual([undefined]);
		expect(collection.replaceItemAt({ id: 2 }, 1)).toBeNull();
		expect(() => collection.removeItemAt(99)).toThrow(RangeError);
		expect(() => collection.replaceItemAt(null, -1)).toThrow(RangeError);
		const sparse = new ArrayCollection(new Array<ItemData>(1));
		expect(sparse.replaceItemAt({ id: 3 }, 0)).toBeUndefined();
	});

	it('distinguishes null selection, sparse selection and an empty selection without converting values', () => {
		const source = new Array<ItemData | null>(3);
		source[0] = { id: 1 };
		source[1] = null;
		const list = makeList(source);
		expect(list.selectedItem).toBeUndefined();
		list.selectedItem = null;
		list.validateProperties();
		expect(list.selectedIndex).toBe(1);
		expect(list.selectedItem).toBeNull();
		list.selectedIndex = 2;
		list.validateProperties();
		expect(list.selectedIndex).toBe(2);
		expect(list.selectedItem).toBeUndefined();
		list.selectedItem = undefined;
		list.validateProperties();
		expect(list.selectedIndex).toBe(-1);
		expect(list.selectedItem).toBeUndefined();
		list.selectedIndex = 99;
		expect(list.selectedItem).toBeUndefined();
		list.validateProperties();
		expect(list.selectedIndex).toBe(2);
		list.dataProvider = undefined;
		list.validateProperties();
		expect(list.selectedItem).toBeUndefined();
	});

	it('retains renderer identity on data replacement and preserves the tap/remove/once event machinery', () => {
		const list = makeList([{ id: 1 }, null]);
		const collection = list.dataProvider;
		if (!(collection instanceof ArrayCollection)) {
			throw new Error('Missing collection');
		}
		const row = list.getElementAt(0)!;
		const taps: (ItemData | null | undefined)[] = [];
		const removed = (): void => {
			throw new Error('Removed listener invoked');
		};
		list.addEventListener('itemTap', event => taps.push(event.item));
		list.addEventListener('itemTap', removed);
		list.removeEventListener('itemTap', removed);
		let once = 0;
		list.once('itemTap', event => {
			once++;
			expect(event.item).toEqual({ id: 2 });
		});
		collection.replaceItemAt({ id: 2 }, 0);
		expect(list.getElementAt(0)).toBe(row);
		expect(row.data).toEqual({ id: 2 });
		row.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_TAP));
		list.getElementAt(1)!.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_TAP));
		list.validateProperties();
		expect(taps).toEqual([{ id: 2 }, null]);
		expect(once).toBe(1);
		expect(list.selectedItem).toBeNull();
		list.dataProvider = undefined;
		list.validateProperties();
	});

	it('reuses a virtual renderer and reports its newly assigned index and nullable data', () => {
		const list = new DataList();
		const layout = new VerticalLayout();
		layout.useVirtualLayout = true;
		list.layout = layout;
		list.itemRenderer = Row;
		list.dataProvider = new ArrayCollection([{ id: 1 }, null, { id: 3 }]);
		list.validateProperties();
		const first = list.getVirtualElementAt(0)!;
		list.setVirtualElementIndicesInView(1, 1);
		const reused = list.getVirtualElementAt(1)!;
		expect(reused).toBe(first);
		expect(reused.itemIndex).toBe(1);
		expect(reused.data).toBeNull();
		const tapped: { item: ItemData | null | undefined; index: number }[] = [];
		list.addEventListener(ItemTapEvent.ITEM_TAP, event =>
			tapped.push({ item: event.item, index: event.itemIndex }),
		);
		reused.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_TAP));
		expect(tapped).toEqual([{ item: null, index: 1 }]);
		expect(list.getVirtualElementAt(-1)).toBeUndefined();
		expect(list.getVirtualElementAt(99)).toBeUndefined();
		list.dataProvider = undefined;
		list.validateProperties();
	});

	it('preserves cancellation, required selection, reset and pending null selection', () => {
		const list = new DataList();
		list.selectedItem = null;
		const collection = new ArrayCollection([{ id: 1 }, null]);
		list.dataProvider = collection;
		list.validateProperties();
		expect(list.selectedItem).toBeNull();
		const cancel = (event: Event): void => event.preventDefault();
		list.addEventListener(Event.CHANGING, cancel);
		list.select(0);
		list.validateProperties();
		expect(list.selectedIndex).toBe(1);
		list.removeEventListener(Event.CHANGING, cancel);
		list.select(0);
		list.validateProperties();
		expect(list.selectedItem).toEqual({ id: 1 });
		list.requireSelection = true;
		list.validateProperties();
		list.selectedItem = undefined;
		list.validateProperties();
		expect(list.selectedIndex).toBe(0);
		collection.source = [null];
		list.validateProperties();
		expect(list.selectedItem).toBeNull();
		list.dataProvider = undefined;
		list.validateProperties();
	});

	it('keeps standalone tap initialization and ComboBox empty/null selection unchanged', () => {
		expect(new ItemTapEvent<ItemData>('itemTap').item).toBeUndefined();
		expect(new Row().data).toBeUndefined();
		const combo = new ComboBox<ItemData | null>();
		combo.dataProvider = new ArrayCollection([{ id: 1 }, null]);
		combo.selectedIndex = 1;
		expect(combo.selectedItem).toBeNull();
		combo.selectedItem = undefined;
		expect(combo.selectedIndex).toBe(-1);
		expect(combo.selectedItem).toBeUndefined();
	});
});
