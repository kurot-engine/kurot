import { afterEach, describe, expect, it } from 'vitest';
import { Stage, TouchEvent, TouchHandler } from '@kurot/core';
import { AddItems, ArrayCollection, ItemRenderer, ItemTapEvent, List, Group, Scroller, Skin, State, UIEvent } from '../src/index.js';

class Row extends ItemRenderer<string, string> {
	public readonly art = new Group();
	public readonly frame = new Group();

	public constructor() {
		super();
		this.width = 80;
		this.height = 30;
		for (const surface of [this.art, this.frame]) {
			surface.width = 80;
			surface.height = 30;
			surface.touchEnabled = true;
		}
		const skin = new Skin();
		skin.setPart('frame', this.frame);
		skin.elementsContent = [this.art];
		skin.states = [new State('up'), new State('down', [new AddItems('frame', '')])];
		this.skinName = skin;
	}
}

const cleanups: (() => void)[] = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

function fixture(scrollable = false) {
	const stage = new Stage();
	stage.resize(240, 200);
	const list = new List<string>();
	const items = new ArrayCollection(['first', 'second', 'third', 'fourth']);
	list.width = 80;
	list.height = scrollable ? 50 : 120;
	list.itemRenderer = Row;
	list.dataProvider = items;
	const root = scrollable ? new Scroller() : list;
	if (root instanceof Scroller) {
		root.width = 80;
		root.height = 50;
		root.viewport = list;
	}
	stage.addChild(root);
	root.validateNow();
	list.validateNow();
	const first = list.getElementAt(0);
	if (!(first instanceof Row)) {
		throw new Error('Missing first row');
	}
	const input = new TouchHandler(stage, document.createElement('canvas'));
	cleanups.push(() => {
		input.dispose();
		stage.removeChild(root);
	});
	const taps: (string | undefined)[] = [];
	list.addEventListener(ItemTapEvent.ITEM_TAP, event => {
		expect(event.itemRenderer).toBe(list.getElementAt(event.itemIndex));
		taps.push(event.item);
	});
	return { stage, list, items, first, input, taps, root };
}

describe('List renderer gestures', () => {
	it('selects on release over a different child of the pressed row, then taps the selected row exactly once more', () => {
		const { stage, list, first, input, taps } = fixture();
		let coreTaps = 0;
		list.addEventListener(TouchEvent.TOUCH_TAP, () => coreTaps++);
		expect(stage.$hitTest(10, 10)).toBe(first.art);
		input.onTouchBegin(10, 10, 1);
		first.validateNow();
		expect(stage.$hitTest(10, 10)).toBe(first.frame);
		input.onTouchEnd(10, 10, 1);
		list.validateNow();
		expect(list.selectedIndex).toBe(0);
		expect(taps).toEqual(['first']);
		expect(coreTaps).toBe(0);

		input.onTouchBegin(10, 10, 2);
		first.validateNow();
		expect(stage.$hitTest(10, 10)).toBe(first.frame);
		input.onTouchEnd(10, 10, 2);
		expect(coreTaps).toBe(1);
		expect(taps).toEqual(['first', 'first']);
	});

	it('ignores cross-row releases, releases outside, and a press begun outside', () => {
		const { list, input, taps } = fixture();
		for (const [from, to] of [[10, 40], [10, 180], [180, 10]]) {
			input.onTouchBegin(10, from, 1);
			input.onTouchEnd(10, to, 1);
		}
		expect(list.selectedIndex).toBe(-1);
		expect(taps).toEqual([]);
		input.onTouchBegin(10, 40, 1);
		input.onTouchEnd(10, 40, 1);
		expect(taps).toEqual(['second']);
	});

	it('matches touch identifiers and does not let a different finger clear a press', () => {
		const { stage, list, first, input, taps } = fixture();
		input.onTouchBegin(10, 10, 1);
		input.onTouchBegin(10, 40, 2);
		input.onTouchEnd(10, 40, 2);
		first.validateNow();
		expect(first.skin?.currentState).toBe('down');
		expect(taps).toEqual(['second']);
		TouchEvent.dispatchTouchEvent(stage, TouchEvent.TOUCH_CANCEL, true, true, 10, 10, 1);
		input.onTouchEnd(10, 10, 1);
		expect(list.selectedIndex).toBe(1);
		expect(taps).toEqual(['second']);
	});

	it('does not tap a replacement item or a renderer that leaves and re-enters the stage', () => {
		const { stage, list, items, first, input, taps } = fixture();
		input.onTouchBegin(10, 10, 1);
		items.replaceItemAt('replacement', 0);
		expect(list.getElementAt(0)).toBe(first);
		first.validateNow();
		expect(first.skin?.currentState).toBe('up');
		input.onTouchEnd(10, 10, 1);
		input.onTouchBegin(10, 10, 1);
		stage.removeChild(list);
		stage.addChild(list);
		input.onTouchEnd(10, 10, 1);
		expect(list.selectedIndex).toBe(-1);
		expect(taps).toEqual([]);

		input.onTouchBegin(10, 10, 1);
		items.itemUpdated('replacement');
		input.onTouchEnd(10, 10, 1);
		expect(taps).toEqual(['replacement']);
	});

	it('lets the Scroller cancel a drag ending in the starting row, then accepts the next tap', () => {
		const { first, list, input, root, taps } = fixture(true);
		let scrollStarts = 0;
		root.addEventListener(UIEvent.CHANGE_START, () => scrollStarts++);
		input.onTouchBegin(10, 12, 1);
		first.validateNow();
		input.onTouchMove(10, 23, 1);
		input.onTouchEnd(10, 23, 1);
		expect(scrollStarts).toBe(1);
		expect(list.selectedIndex).toBe(-1);
		expect(taps).toEqual([]);
		first.validateNow();
		expect(first.skin?.currentState).toBe('up');
		input.onTouchBegin(10, 12, 1);
		input.onTouchEnd(10, 12, 1);
		expect(taps).toEqual(['first']);
	});
});
