import { describe, it, expect } from 'vitest';
import { TouchEvent, Event, Stage } from '@blakron/core';
import { ComboBox } from '../src/blakron/components/ComboBox.js';
import { Group } from '../src/blakron/components/Group.js';
import { Scroller } from '../src/blakron/components/Scroller.js';
import { ArrayCollection } from '../src/blakron/collections/ArrayCollection.js';
import { VerticalLayout } from '../src/blakron/layouts/VerticalLayout.js';

function makeComboBox(items: unknown[] = []): ComboBox {
	const cb = new ComboBox();
	cb.dataProvider = new ArrayCollection(items);
	return cb;
}

function tap(target: ComboBox): void {
	target.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_TAP));
}

describe('ComboBox', () => {
	describe('trigger tap', () => {
		it('tapping the component toggles isOpen', () => {
			const cb = makeComboBox(['a', 'b']);
			expect(cb.isOpen).toBe(false);

			tap(cb);
			expect(cb.isOpen).toBe(true);

			tap(cb);
			expect(cb.isOpen).toBe(false);
		});

		it('does not throw when dropDown is present but tap target is the component itself', () => {
			const cb = makeComboBox(['a', 'b']);
			// A real drop-down will not contain the ComboBox itself, so a tap on
			// the component body should still toggle. This guards the contains() path.
			const dropDown = new Group();
			(cb as unknown as { dropDown: Group }).dropDown = dropDown;

			expect(() => tap(cb)).not.toThrow();
			expect(cb.isOpen).toBe(true);
		});
	});

	describe('open / close', () => {
		it('open()/close() toggle isOpen and sync dropDown visibility', () => {
			const cb = makeComboBox(['a', 'b']);
			const dropDown = new Group();
			(cb as unknown as { dropDown: Group }).dropDown = dropDown;

			cb.open();
			expect(cb.isOpen).toBe(true);
			expect(dropDown.visible).toBe(true);

			cb.close();
			expect(cb.isOpen).toBe(false);
			expect(dropDown.visible).toBe(false);
		});

		it('temporarily moves above sibling content while open', () => {
			const parent = new Group();
			const cb = makeComboBox(['a', 'b']);
			const sibling = new Group();
			parent.addChild(cb);
			parent.addChild(sibling);

			cb.open();
			expect(parent.getChildIndex(cb)).toBe(1);

			cb.close();
			expect(parent.getChildIndex(cb)).toBe(0);
		});

		it('does not change child order inside a layout container', () => {
			const parent = new Group();
			parent.layout = new VerticalLayout();
			const cb = makeComboBox(['a', 'b']);
			parent.addChild(cb);
			parent.addChild(new Group());

			cb.open();

			expect(parent.getChildIndex(cb)).toBe(0);
		});

		it('moves only the drop-down to the stage while open', () => {
			const stage = new Stage();
			const cb = makeComboBox(['a', 'b']);
			const skin = new Group();
			const dropDown = new Group();
			dropDown.x = 5;
			dropDown.y = 36;
			skin.addChild(dropDown);
			cb.addChild(skin);
			stage.addChild(cb);
			(cb as unknown as { dropDown: Group }).dropDown = dropDown;

			cb.open();
			expect(dropDown.parent).toBe(stage);
			expect(cb.parent).toBe(stage);

			cb.close();
			expect(dropDown.parent).toBe(skin);
			expect(dropDown.x).toBe(5);
			expect(dropDown.y).toBe(36);
		});

		it('restores the staged drop-down when its skin part is removed', () => {
			const stage = new Stage();
			const cb = makeComboBox(['a', 'b']);
			const skin = new Group();
			const dropDown = new Scroller();
			skin.addChild(dropDown);
			cb.addChild(skin);
			stage.addChild(cb);
			cb.setSkinPart('dropDown', dropDown);

			cb.open();
			expect(dropDown.parent).toBe(stage);
			cb.setSkinPart('dropDown', undefined);

			expect(cb.isOpen).toBe(false);
			expect(dropDown.parent).toBe(skin);
		});
	});

	describe('selection', () => {
		it('selectedIndex updates selectedItem and dispatches CHANGE', () => {
			const cb = makeComboBox(['a', 'b', 'c']);
			cb.validateProperties();

			const changes: unknown[] = [];
			cb.addEventListener(Event.CHANGE, () => changes.push(cb.selectedIndex));

			cb.selectedIndex = 1;
			cb.validateProperties();

			expect(changes).toHaveLength(1);
			expect(cb.selectedItem).toBe('b');
		});

		it('selectedItem setter routes through selectedIndex (dispatches CHANGE, stays consistent)', () => {
			const cb = makeComboBox(['a', 'b', 'c']);
			cb.validateProperties();

			const changes: unknown[] = [];
			cb.addEventListener(Event.CHANGE, () => changes.push(cb.selectedItem));

			cb.selectedItem = 'c';
			cb.validateProperties();

			expect(changes).toHaveLength(1);
			expect(changes[0]).toBe('c');
			expect(cb.selectedIndex).toBe(2);
		});

		it('selectedItem not in dataProvider clears selection without throwing', () => {
			const cb = makeComboBox(['a', 'b']);
			cb.validateProperties();

			cb.selectedIndex = 0;
			cb.validateProperties();
			expect(cb.selectedIndex).toBe(0);

			// Setting an item not in the provider: getItemIndex returns -1.
			cb.selectedItem = 'zzz';
			cb.validateProperties();

			expect(cb.selectedIndex).toBe(-1);
		});

		it('dispatches CHANGE when selectedIndex is set and reflects in text via itemToLabel', () => {
			const cb = makeComboBox(['apple', 'banana']);
			cb.validateProperties();

			let fired = false;
			cb.addEventListener(Event.CHANGE, () => (fired = true));

			cb.selectedIndex = 1;
			cb.validateProperties();

			expect(fired).toBe(true);
			// text getter falls back to itemToLabel when no labelDisplay skin part.
			expect(cb.text).toBe('banana');
		});
	});

	describe('itemToLabel', () => {
		it('uses labelField, labelFunction, and primitives', () => {
			const cb = new ComboBox();
			cb.labelField = 'name';

			expect(cb.itemToLabel('plain')).toBe('plain');
			expect(cb.itemToLabel(42)).toBe('42');
			expect(cb.itemToLabel({ name: 'Alice' })).toBe('Alice');

			cb.labelFunction = item => `[${String(item)}]`;
			expect(cb.itemToLabel('x')).toBe('[x]');
		});
	});
});
