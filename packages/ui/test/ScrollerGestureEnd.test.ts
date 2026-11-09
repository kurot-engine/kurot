import { afterEach, describe, expect, it } from 'vitest';
import { Event, Stage, TouchEvent, TouchHandler } from '@kurot/core';
import {
	ArrayCollection, Button, Group, ItemRenderer, ItemTapEvent, List, Rect,
	Scroller, Skin, State, UIEvent, VerticalLayout,
} from '../src/index.js';

const BUBBLING_PHASE = 3; // Core's EventPhase is a const enum with no runtime export.
class Row extends ItemRenderer {
	public readonly surface = new Group();

	public constructor() {
		super();
		this.width = 100;
		this.height = 80;
		this.surface.width = this.width;
		this.surface.height = this.height;
		const skin = new Skin();
		skin.elementsContent = [this.surface];
		skin.states = [new State('up'), new State('down')];
		this.skinName = skin;
	}
}

const cleanups: (() => void)[] = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

function fixture(nested = false) {
	const stage = new Stage();
	stage.resize(240, 200);
	const scroller = new Scroller();
	scroller.width = scroller.height = 100;
	const list = new List<number>();
	list.width = list.height = 100;
	list.layout = new VerticalLayout();
	list.itemRenderer = Row;
	list.dataProvider = new ArrayCollection([0, 1, 2, 3, 4, 5]);
	scroller.viewport = list;
	const outer = new Scroller();
	const container = new Group();
	container.addChild(scroller);
	if (nested) {
		const spacer = new Rect(1, 1);
		spacer.y = 400;
		container.addChild(spacer);
		outer.width = outer.height = 100;
		outer.viewport = container;
	}
	const root = nested ? outer : container;
	stage.addChild(root);
	root.validateNow();
	container.validateNow();
	scroller.validateNow();
	list.validateNow();
	const canvas = document.createElement('canvas');
	const input = new TouchHandler(stage, canvas);
	cleanups.push(() => {
		input.dispose();
		stage.removeChild(root);
	});
	const items: number[] = [];
	list.addEventListener(ItemTapEvent.ITEM_TAP, event => items.push(event.itemIndex));
	function drag(id: number): void {
		input.onTouchBegin(20, 70, id);
		input.onTouchMove(20, 40, id);
		input.onTouchMove(20, 20, id);
	}
	return { stage, scroller, outer, container, list, input, canvas, items, drag };
}

function addButton(row: ItemRenderer): Button {
	const button = new Button();
	const surface = new Group();
	button.width = surface.width = 100;
	button.height = surface.height = 80;
	button.addChild(surface);
	row.addChild(button);
	return button;
}

describe('Scroller gesture termination', () => {
	it('bubbles the original native end once and lets an outer gesture rearm for the next drag', () => {
		const { stage, container, list, input, items, drag } = fixture();
		const row = list.getElementAt(0);
		let captured: TouchEvent | undefined;
		const outerIDs: number[] = [];
		const stageIDs: number[] = [];
		const armed: number[] = [];
		let pending: number | undefined;
		list.addEventListener(TouchEvent.TOUCH_BEGIN, event => {
			if (pending === undefined) {
				pending = event.touchPointID;
				armed.push(pending);
			}
		});
		stage.addEventListener(TouchEvent.TOUCH_END, event => { captured = event; }, true);
		container.addEventListener(TouchEvent.TOUCH_END, event => {
			expect(event).toBe(captured);
			expect(event.currentTarget).toBe(container);
			expect(event.eventPhase).toBe(BUBBLING_PHASE);
			outerIDs.push(event.touchPointID);
		});
		stage.addEventListener(TouchEvent.TOUCH_END, event => {
			expect(event).toBe(captured);
			expect(event.target).toBe((row as Row).surface);
			expect(event.currentTarget).toBe(stage);
			expect(event.eventPhase).toBe(BUBBLING_PHASE);
			expect([event.stageX, event.stageY, event.touchDown]).toEqual([20, 20, false]);
			const local = (row as Row).surface.globalToLocal(20, 20);
			expect([event.localX, event.localY]).toEqual([local.x, local.y]);
			expect(event.isDefaultPrevented()).toBe(true);
			expect(pending).toBe(event.touchPointID);
			pending = undefined;
			stageIDs.push(event.touchPointID);
			captured = undefined;
		});
		for (const id of [17, 42]) {
			drag(id);
			input.onTouchEnd(20, 20, id);
		}
		expect(list.scrollV).toBeGreaterThan(0);
		expect(outerIDs).toEqual([17, 42]);
		expect(stageIDs).toEqual(outerIDs);
		expect(armed).toEqual(stageIDs);
		expect(items).toEqual([]);
		expect(list.selectedIndex).toBe(-1);
	});

	it('preserves native taps, suppresses a same-row scroll tap, and clears the pressed skin', () => {
		const { stage, list, input, items, drag } = fixture();
		const row = list.getElementAt(0)!;
		const ends: boolean[] = [];
		let rawTaps = 0;
		stage.addEventListener(TouchEvent.TOUCH_END, e => ends.push(e.isDefaultPrevented()));
		list.addEventListener(TouchEvent.TOUCH_TAP, () => rawTaps++);
		drag(1);
		row.validateNow();
		expect(row.skin?.currentState).toBe('down');
		expect(stage.$hitTest(20, 20)).toBe((row as Row).surface);
		input.onTouchEnd(20, 20, 1);
		row.validateNow();
		expect(row.skin?.currentState).toBe('up');
		expect(items).toEqual([]);
		expect(rawTaps).toBe(0);

		input.onTouchBegin(20, 20, 1);
		input.onTouchMove(20, 23, 1);
		input.onTouchEnd(20, 23, 1);
		expect(ends).toEqual([true, false]);
		expect(items).toEqual([0]);
		expect(list.selectedIndex).toBe(0);
		expect(rawTaps).toBe(1);
	});

	it('keeps ends and follow-up taps independent across fingers', () => {
		const { stage, list, input, items, drag } = fixture();
		const ends: [number, boolean][] = [];
		const taps: number[] = [];
		stage.addEventListener(TouchEvent.TOUCH_END, e => ends.push([e.touchPointID, e.isDefaultPrevented()]));
		list.addEventListener(TouchEvent.TOUCH_TAP, e => taps.push(e.touchPointID));
		drag(1);
		input.onTouchBegin(20, 90, 2);
		input.onTouchEnd(20, 90, 2);
		input.onTouchEnd(20, 20, 1);
		expect(ends).toEqual([[2, false], [1, true]]);
		expect(items).toEqual([1]);
		expect(taps).toEqual([2]);
		expect(list.selectedIndex).toBe(1);
	});

	it('delivers a cancel once, clears the press, and accepts the next gesture', () => {
		const { stage, list, input, items, drag } = fixture();
		const row = list.getElementAt(0)!;
		const cancels: number[] = [];
		const ends: number[] = [];
		stage.addEventListener(TouchEvent.TOUCH_END, e => ends.push(e.touchPointID));
		stage.addEventListener(TouchEvent.TOUCH_CANCEL, e => cancels.push(e.touchPointID));
		drag(3);
		TouchEvent.dispatchTouchEvent(row, TouchEvent.TOUCH_CANCEL, true, true, 20, 20, 3);
		row.validateNow();
		expect(row.skin?.currentState).toBe('up');
		expect(cancels).toEqual([3]);
		expect(ends).toEqual([]);
		expect(items).toEqual([]);
		input.onTouchBegin(20, 20, 4);
		input.onTouchEnd(20, 20, 4);
		expect(items).toEqual([0]);
		expect(ends).toEqual([4]);
	});

	it('does not activate a button in the viewport when its stage listener sees the scroll end', () => {
		const { input, list, drag, items } = fixture();
		const button = addButton(list.getElementAt(0)!);
		let changes = 0;
		button.addEventListener(Event.CHANGE, () => changes++);
		drag(1);
		expect(button.touchCaptured).toBe(true);
		input.onTouchEnd(20, 20, 1);
		expect(button.touchCaptured).toBe(false);
		expect(changes).toBe(0);
		expect(items).toEqual([]);
		input.onTouchBegin(20, 20, 1);
		input.onTouchEnd(20, 20, 1);
		expect(changes).toBe(1);
	});

	it('a scrolling finger cannot release a button held by a different finger', () => {
		const { input, list, drag, items } = fixture();
		const button = addButton(list.getElementAt(1)!);
		let changes = 0;
		button.addEventListener(Event.CHANGE, () => changes++);
		drag(1);
		input.onTouchBegin(20, 90, 2);
		input.onTouchEnd(20, 20, 1);
		expect(button.touchCaptured).toBe(true);
		expect(changes).toBe(0);
		input.onTouchEnd(20, 90, 2);
		expect(button.touchCaptured).toBe(false);
		expect(changes).toBe(1);
		expect(items).toEqual([1]);
	});

	it('finishes a browser-cancelled scroll without generating an item tap', () => {
		const { stage, input, canvas, drag, items } = fixture();
		const ends: number[] = [];
		stage.addEventListener(TouchEvent.TOUCH_END, event => ends.push(event.touchPointID));
		drag(9);
		const cancel = new window.Event('touchcancel');
		Object.assign(cancel, { changedTouches: [{ identifier: 9, clientX: 20, clientY: 20 }] });
		canvas.dispatchEvent(cancel);
		expect(ends).toEqual([9]);
		expect(items).toEqual([]);
		input.onTouchBegin(20, 20, 9);
		input.onTouchEnd(20, 20, 9);
		expect(items).toEqual([0]);
	});

	it('gives a nested drag one scroll owner and one end per ancestor', () => {
		const { stage, scroller, outer, container, list, input, items, drag } = fixture(true);
		expect(container.contentHeight).toBeGreaterThan(100);
		const starts: Scroller[] = [];
		const ends: string[] = [];
		for (const view of [scroller, outer]) {
			view.addEventListener(UIEvent.CHANGE_START, () => starts.push(view));
		}
		for (const [name, target] of [['inner', scroller], ['outer', outer], ['stage', stage]] as const) {
			target.addEventListener(TouchEvent.TOUCH_END, () => ends.push(name));
		}
		drag(5);
		input.onTouchEnd(20, 20, 5);
		expect(ends).toEqual(['inner', 'outer', 'stage']);
		expect(starts).toEqual([scroller]);
		expect(container.scrollV).toBe(0);
		expect(list.scrollV).toBeGreaterThan(0);
		expect(items).toEqual([]);
	});

	it('lets an outer viewport take the drag when only it can scroll in that direction', () => {
		const { scroller, outer, container, list, input, items } = fixture(true);
		const spacer = new Group();
		spacer.width = 1;
		spacer.x = 400;
		container.addChild(spacer);
		container.validateNow();
		const starts: Scroller[] = [];
		for (const view of [scroller, outer]) {
			view.addEventListener(UIEvent.CHANGE_START, () => starts.push(view));
		}
		input.onTouchBegin(70, 20, 1);
		input.onTouchMove(40, 20, 1);
		input.onTouchMove(20, 20, 1);
		input.onTouchEnd(20, 20, 1);
		expect(starts).toEqual([outer]);
		expect(container.scrollH).toBeGreaterThan(0);
		expect(list.scrollV).toBe(0);
		expect(items).toEqual([]);
	});

	it('finishes the interrupted rebound before the next drag starts', () => {
		const { input, scroller, list, drag, items } = fixture();
		const changes: string[] = [];
		scroller.addEventListener(UIEvent.CHANGE_START, () => changes.push('start'));
		scroller.addEventListener(UIEvent.CHANGE_END, () => changes.push('end'));
		input.onTouchBegin(20, 20, 1);
		input.onTouchMove(20, 40, 1);
		input.onTouchMove(20, 60, 1);
		input.onTouchEnd(20, 60, 1);
		expect(list.scrollV).toBeLessThan(0);
		expect(changes).toEqual(['start']);
		drag(2);
		input.onTouchEnd(20, 20, 2);
		expect(changes).toEqual(['start', 'end', 'start', 'end']);
		expect(items).toEqual([]);
	});
});
