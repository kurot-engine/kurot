import { describe, it, expect } from 'vitest';
import { Stage, TouchEvent } from '@kurot/core';
import { ItemRenderer, Rect, SetProperty, Skin, State } from '../src/index.js';

describe('ItemRenderer', () => {
	describe('skin states', () => {
		function mount(...variants: string[]) {
			const item = new ItemRenderer();
			const skin = new Skin();
			const marker = new Rect(10, 10, 0);
			const states = ['up', 'down', 'disabled', ...variants];
			skin.setPart('marker', marker);
			skin.elementsContent = [marker];
			skin.states = states.map((name, index) =>
				new State(name, [new SetProperty('marker', 'fillColor', index + 1)]),
			);
			item.skinName = skin;
			new Stage().addChild(item);

			function expectSkin(name: string): void {
				item.validateNow();
				expect(skin.currentState).toBe(name);
				expect(marker.fillColor).toBe(states.indexOf(name) + 1);
			}
			return { item, expectSkin };
		}

		it('shows the base states for an unselected item even with selection variants', () => {
			const { item, expectSkin } = mount('upAndSelected', 'downAndSelected', 'disabledAndSelected');
			expectSkin('up');
			item.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_BEGIN, true));
			expectSkin('down');
			item.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_END, true));
			expectSkin('up');
			item.enabled = false;
			expectSkin('disabled');
		});

		it.each([
			{ variants: [], idle: 'down', pressed: 'down' },
			{ variants: ['upAndSelected'], idle: 'upAndSelected', pressed: 'down' },
			{ variants: ['downAndSelected'], idle: 'down', pressed: 'downAndSelected' },
		])('keeps the selected skin through a second press and release with $variants', ({ variants, idle, pressed }) => {
			const { item, expectSkin } = mount(...variants);
			item.selected = true;
			expectSkin(idle);
			item.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_BEGIN, true));
			expectSkin(pressed);
			item.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_END, true));
			expectSkin(idle);
			expect(item.selected).toBe(true);
		});

		it.each([
			{ variants: ['upAndSelected'], disabled: 'disabled' },
			{ variants: ['upAndSelected', 'disabledAndSelected'], disabled: 'disabledAndSelected' },
		])('shows the declared disabled skin when a selected item is disabled with $variants', ({ variants, disabled }) => {
			const { item, expectSkin } = mount(...variants);
			item.selected = true;
			expectSkin('upAndSelected');
			item.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_BEGIN, true));
			item.enabled = false;
			expectSkin(disabled);
			item.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_END, true));
			expectSkin(disabled);
			item.enabled = true;
			expect(item.selected).toBe(true);
			expectSkin('upAndSelected');
		});
	});

	describe('data', () => {
		it('stores data and dispatches PropertyEvent', () => {
			const ir = new ItemRenderer();
			let prop = '';
			ir.addEventListener('propertyChange', (e) => {
				prop = (e as unknown as { property: string }).property;
			});
			ir.data = { id: 1 };
			expect(ir.data).toEqual({ id: 1 });
			expect(prop).toBe('data');
		});

		it('does not dispatch when data is the same reference', () => {
			const ir = new ItemRenderer();
			const obj = { id: 1 };
			ir.data = obj;
			let count = 0;
			ir.addEventListener('propertyChange', () => count++);
			ir.data = obj;
			expect(count).toBe(0);
		});
	});

	describe('selected', () => {
		it('does not dispatch PropertyEvent on selected change (only invalidateState)', () => {
			const ir = new ItemRenderer();
			let count = 0;
			ir.addEventListener('propertyChange', () => count++);
			ir.selected = true;
			expect(count).toBe(0);
		});
	});
});
