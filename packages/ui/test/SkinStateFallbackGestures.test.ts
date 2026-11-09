import { afterEach, describe, expect, it } from 'vitest';
import { Event, Stage, TouchEvent, TouchHandler } from '@kurot/core';
import { AddItems, ArrayCollection, Group, ItemRenderer, ItemTapEvent, List, Scroller, Skin, State, UIEvent } from '../src/index.js';

class MaterialRow extends ItemRenderer<string, number> {
	public declare icon: Group;
	public declare quantity: Group;

	public constructor(selectedStates = false) {
		super();
		this.width = this.height = 70;
		const icon = new Group();
		const quantity = new Group();
		icon.width = icon.height = 70;
		quantity.width = 20;
		quantity.height = 10;
		quantity.touchEnabled = false;
		const skin = new Skin();
		skin.skinParts = ['icon', 'quantity'];
		skin.setPart('icon', icon);
		skin.setPart('quantity', quantity);
		const contents = (): AddItems[] => [new AddItems('icon', '', 0), new AddItems('quantity', '', 1)];
		skin.states = [new State('up', contents()), new State('disabled')];
		if (selectedStates) {
			skin.states.push(...['upAndSelected', 'downAndSelected', 'disabledAndSelected'].map(name => new State(name, contents())));
		}
		this.skinName = skin;
	}
}

class SelectedRow extends MaterialRow {
	public constructor() {
		super(true);
	}
}

const cleanups: (() => void)[] = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

function fixture(mode: 'row' | 'list' | 'scroll' = 'row', rowType = MaterialRow) {
	const stage = new Stage();
	stage.resize(240, 240);
	const list = new List<number>();
	list.width = 70;
	list.height = 210;
	list.itemRenderer = rowType;
	list.dataProvider = new ArrayCollection([1, 2, 3, 4]);
	const scroller = new Scroller();
	scroller.width = 70;
	scroller.height = 80;
	const root = mode === 'row' ? new rowType() : mode === 'list' ? list : scroller;
	if (mode === 'scroll') {
		scroller.viewport = list;
	}
	stage.addChild(root);
	root.validateNow();
	if (mode !== 'row') {
		list.validateNow();
	}
	const row = mode === 'row' ? root : list.getElementAt(0);
	if (!(row instanceof MaterialRow)) {
		throw new Error('Missing material row');
	}
	const input = new TouchHandler(stage, document.createElement('canvas'));
	const lifecycle: string[] = [];
	for (const part of [row.icon, row.quantity]) {
		for (const type of [Event.ADDED, Event.REMOVED, Event.ADDED_TO_STAGE, Event.REMOVED_FROM_STAGE]) {
			part.addEventListener(type, event => lifecycle.push(event.type));
		}
	}
	const coreTaps: number[] = [];
	const itemTaps: number[] = [];
	row.addEventListener(TouchEvent.TOUCH_TAP, event => coreTaps.push(event.touchPointID));
	list.addEventListener(ItemTapEvent.ITEM_TAP, event => itemTaps.push(event.itemIndex));
	cleanups.push(() => {
		input.dispose();
		stage.removeChild(root);
	});
	const expectMounted = (): void => {
		row.validateNow();
		expect(row.icon.parent).toBe(row);
		expect(row.quantity.parent).toBe(row);
		expect([row.getChildAt(0), row.getChildAt(1)]).toEqual([row.icon, row.quantity]);
		expect(row.icon.visible).toBe(true);
		expect(row.quantity.visible).toBe(true);
	};
	return { stage, list, scroller, row, input, lifecycle, coreTaps, itemTaps, expectMounted };
}

describe('Skin fallback through native touch gestures', () => {
	it.each(['row', 'list'] as const)('keeps sparse %s contents mounted and dispatches one tap per press, including selected repeats', mode => {
		const { stage, list, row, input, lifecycle, coreTaps, itemTaps, expectMounted } = fixture(mode);
		for (const id of [1, 2, 3]) {
			expect(stage.$hitTest(35, 35)).toBe(row.icon);
			input.onTouchBegin(35, 35, id);
			expectMounted();
			expect(row.currentState).toBe('down');
			expect(row.skin?.currentState).toBe('up');
			expect(stage.$hitTest(35, 35)).toBe(row.icon);
			input.onTouchEnd(35, 35, id);
			list.validateNow();
			expectMounted();
			expect(row.selected).toBe(mode === 'list');
			expect(coreTaps).toHaveLength(id);
			expect(itemTaps).toHaveLength(mode === 'list' ? id : 0);
		}
		expect(coreTaps).toEqual([1, 2, 3]);
		expect(itemTaps).toEqual(mode === 'list' ? [0, 0, 0] : []);
		expect(lifecycle).toEqual([]);
	});

	it('honors disabled and restores the same content on re-enable without activating the disabled row', () => {
		const { row, input, coreTaps, expectMounted } = fixture();
		input.onTouchBegin(35, 35, 1);
		expectMounted();
		row.enabled = false;
		row.validateNow();
		expect(row.skin?.currentState).toBe('disabled');
		expect(row.icon.parent).toBeUndefined();
		input.onTouchEnd(35, 35, 1);
		input.onTouchBegin(35, 35, 2);
		input.onTouchEnd(35, 35, 2);
		expect(coreTaps).toEqual([]);
		row.enabled = true;
		expectMounted();
		input.onTouchBegin(35, 35, 3);
		expectMounted();
		input.onTouchEnd(35, 35, 3);
		expect(coreTaps).toEqual([3]);
	});

	it('preserves declared selected, pressed-selected and disabled-selected states', () => {
		const { list, row, input, itemTaps } = fixture('list', SelectedRow);
		input.onTouchBegin(35, 35, 1);
		row.validateNow();
		input.onTouchEnd(35, 35, 1);
		list.validateNow();
		row.validateNow();
		expect(row.skin?.currentState).toBe('upAndSelected');
		input.onTouchBegin(35, 35, 2);
		row.validateNow();
		expect(row.skin?.currentState).toBe('downAndSelected');
		input.onTouchEnd(35, 35, 2);
		row.validateNow();
		expect(row.skin?.currentState).toBe('upAndSelected');
		expect(itemTaps).toEqual([0, 0]);
		row.enabled = false;
		row.validateNow();
		expect(row.skin?.currentState).toBe('disabledAndSelected');
	});

	it('keeps contents mounted while scrolling cancels activation, then accepts the next tap once', () => {
		const { scroller, row, list, input, lifecycle, coreTaps, itemTaps, expectMounted } = fixture('scroll');
		let scrollStarts = 0;
		scroller.addEventListener(UIEvent.CHANGE_START, () => scrollStarts++);
		input.onTouchBegin(35, 50, 1);
		expectMounted();
		input.onTouchMove(35, 30, 1);
		expectMounted();
		input.onTouchEnd(35, 30, 1);
		expectMounted();
		expect(scrollStarts).toBe(1);
		expect(list.selectedIndex).toBe(-1);
		expect(coreTaps).toEqual([]);
		expect(itemTaps).toEqual([]);
		input.onTouchBegin(35, 30, 2);
		expectMounted();
		input.onTouchEnd(35, 30, 2);
		list.validateNow();
		expectMounted();
		expect(row.selected).toBe(true);
		expect(coreTaps).toEqual([2]);
		expect(itemTaps).toEqual([0]);
		expect(lifecycle).toEqual([]);
	});
});
