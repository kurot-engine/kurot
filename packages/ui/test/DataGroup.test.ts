/**
 * DataGroup regression tests.
 *
 * Verifies renderer creation from dataProvider, data binding to renderers,
 * rendererAdded/rendererRemoved lifecycle, and renderer recycling on
 * dataProvider change.
 */
import { describe, it, expect } from 'vitest';
import { DataGroup, ItemRenderer, ArrayCollection } from '../src/index.js';

/** Custom renderer that records its data for assertion. */
class TestRenderer extends ItemRenderer {
	public lastData: unknown = null;
	protected override dataChanged(): void {
		this.lastData = this.data;
	}
}

/** Subclass that records rendererAdded/rendererRemoved calls. */
class TrackingDataGroup extends DataGroup {
	public addedCount = 0;
	public removedCount = 0;
	public override rendererAdded(_r: ItemRenderer, _i: number, _item: unknown): void {
		this.addedCount++;
	}
	public override rendererRemoved(_r: ItemRenderer, _i: number, _item: unknown): void {
		this.removedCount++;
	}
}

function makeGroup(items: unknown[], renderer = TestRenderer): TrackingDataGroup {
	const dg = new TrackingDataGroup();
	dg.itemRenderer = renderer;
	dg.dataProvider = new ArrayCollection(items);
	dg.validateProperties();
	return dg;
}

describe('DataGroup', () => {
	it('creates one renderer per data item', () => {
		const dg = makeGroup(['a', 'b', 'c']);
		expect(dg.addedCount).toBe(3);
		expect(dg.numElements).toBe(3);
	});

	it('binds data to each renderer via updateRenderer', () => {
		const dg = makeGroup(['x', 'y']);
		const r0 = dg.getElementAt(0) as TestRenderer;
		const r1 = dg.getElementAt(1) as TestRenderer;
		expect(r0.lastData).toBe('x');
		expect(r1.lastData).toBe('y');
		expect(r0.itemIndex).toBe(0);
		expect(r1.itemIndex).toBe(1);
	});

	it('removes all renderers when dataProvider is replaced', () => {
		const dg = makeGroup(['a', 'b']);
		expect(dg.removedCount).toBe(0);

		dg.dataProvider = new ArrayCollection(['c']);
		dg.validateProperties();

		expect(dg.removedCount).toBe(2); // old renderers removed
		expect(dg.addedCount).toBe(3); // 2 old + 1 new
		expect(dg.numElements).toBe(1);
	});

	it('removes all renderers when dataProvider is set to null', () => {
		const dg = makeGroup(['a', 'b', 'c']);
		dg.dataProvider = undefined;
		dg.validateProperties();
		expect(dg.removedCount).toBe(3);
		expect(dg.numElements).toBe(0);
	});

	it('updates renderer data when an item is replaced in the collection', () => {
		const dp = new ArrayCollection(['a', 'b']);
		const dg = makeGroup([]);
		dg.dataProvider = dp;
		dg.validateProperties();

		// Replace item at index 0.
		dp.replaceItemAt('Z', 0);
		dg.validateProperties();

		const r0 = dg.getElementAt(0) as TestRenderer;
		expect(r0.lastData).toBe('Z');
	});
});
