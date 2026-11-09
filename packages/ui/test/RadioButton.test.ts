/**
 * RadioButton / RadioButtonGroup regression tests.
 *
 * Covers the egret-parity fixes:
 * - default groupName ("radioGroup") so orphan radios still get mutual exclusion
 * - RadioButtonGroup dispatches Event.CHANGE on interactive selection
 * - group-level `enabled` propagates to members
 * - selectedValue falls back to the radio's label when value is empty
 * - programmatic `selected = false` clears the group's selection
 * - addInstance adopts an already-selected radio
 */
import { describe, it, expect } from 'vitest';
import { Stage, TouchEvent } from '@kurot/core';
import { RadioButton, RadioButtonGroup, Skin, State } from '../src/index.js';

describe('RadioButton / RadioButtonGroup', () => {
	describe.each([
		{ kind: 'basic', withSelectedStates: false, tapped: 'down', assigned: 'down' },
		{ kind: 'AndSelected', withSelectedStates: true, tapped: 'downAndSelected', assigned: 'upAndSelected' },
	])('$kind skin', ({ withSelectedStates, tapped, assigned }) => {
		function addRadio(stage: Stage, group: RadioButtonGroup): RadioButton {
			const names = ['up', 'down', 'disabled'];
			if (withSelectedStates) {
				names.push('upAndSelected', 'downAndSelected', 'disabledAndSelected');
			}
			const skin = new Skin();
			skin.states = names.map(name => new State(name));
			const radio = new RadioButton();
			radio.group = group;
			radio.skinName = skin;
			stage.addChild(radio);
			return radio;
		}

		function tap(radio: RadioButton): void {
			radio.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_BEGIN, true));
			radio.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_END, true));
		}

		function expectSkin(radio: RadioButton, state: string): void {
			radio.validateNow();
			expect(radio.skin?.currentState).toBe(state);
		}

		it('restores the old skin after a tap or a programmatic selection takes its place', () => {
			const stage = new Stage();
			const group = new RadioButtonGroup();
			const a = addRadio(stage, group);
			const b = addRadio(stage, group);
			tap(a);
			expectSkin(a, tapped);
			tap(b);
			expect(group.selection).toBe(b);
			expect(a.selected).toBe(false);
			expectSkin(a, 'up');
			expectSkin(b, tapped);

			a.selected = true;
			expect(group.selection).toBe(a);
			expectSkin(b, 'up');
			expectSkin(a, assigned);
		});

		it('clears the tapped skin when either the group or the radio is deselected', () => {
			const group = new RadioButtonGroup();
			const radio = addRadio(new Stage(), group);
			tap(radio);
			group.selection = undefined;
			expect(radio.selected).toBe(false);
			expectSkin(radio, 'up');

			tap(radio);
			radio.selected = false;
			expect(group.selection).toBeUndefined();
			expectSkin(radio, 'up');
		});

		it('keeps a real press down until stage removal cancels capture', () => {
			const stage = new Stage();
			const group = new RadioButtonGroup();
			const radio = addRadio(stage, group);
			tap(radio);
			radio.dispatchEvent(new TouchEvent(TouchEvent.TOUCH_BEGIN, true));
			group.selection = undefined;
			expectSkin(radio, 'down');
			stage.removeChild(radio);
			stage.addChild(radio);
			expect(radio.touchCaptured).toBe(false);
			expectSkin(radio, 'up');
		});

		it('restores the deselected skin when a disabled group is re-enabled after a transfer', () => {
			const stage = new Stage();
			const group = new RadioButtonGroup();
			const a = addRadio(stage, group);
			const b = addRadio(stage, new RadioButtonGroup());
			tap(a);
			group.enabled = false;
			expectSkin(a, withSelectedStates ? 'disabledAndSelected' : 'disabled');
			b.selected = true;
			b.group = group;
			expect(group.selection).toBe(b);
			expect(a.selected).toBe(false);
			expectSkin(a, 'disabled');
			group.enabled = true;
			expectSkin(a, 'up');
			expectSkin(b, assigned);
		});
	});

	describe('default groupName', () => {
		it('defaults to "radioGroup" so orphan radios are mutually exclusive', () => {
			const rb1 = new RadioButton();
			const rb2 = new RadioButton();

			// Both fall into the default group without any explicit groupName.
			expect(rb1.groupName).toBe('radioGroup');
			expect(rb2.groupName).toBe('radioGroup');
			expect(rb1.group).toBe(rb2.group);

			rb1.selected = true;
			expect(rb1.selected).toBe(true);
			expect(rb2.selected).toBe(false);

			// Selecting rb2 must deselect rb1 — same default group.
			rb2.selected = true;
			expect(rb1.selected).toBe(false);
			expect(rb2.selected).toBe(true);
		});
	});

	describe('group Event.CHANGE', () => {
		it('dispatches CHANGE on interactive selection (buttonReleased)', () => {
			const rb1 = new RadioButton();
			rb1.groupName = 'g_change';
			const rb2 = new RadioButton();
			rb2.groupName = 'g_change';

			const group = rb1.group!;
			let changeCount = 0;
			group.addEventListener('change', () => changeCount++);

			// Interactive selection dispatches CHANGE on the group.
			(rb1 as unknown as { buttonReleased: () => void }).buttonReleased();
			expect(changeCount).toBe(1);

			(rb2 as unknown as { buttonReleased: () => void }).buttonReleased();
			expect(changeCount).toBe(2);
		});

		it('does NOT dispatch Change on programmatic selected = true', () => {
			const rb = new RadioButton();
			rb.groupName = 'g_prog';
			const group = rb.group!;

			let changeCount = 0;
			group.addEventListener('change', () => changeCount++);

			// Programmatic — fireChange is false.
			rb.selected = true;
			expect(changeCount).toBe(0);
		});
	});

	describe('group enabled', () => {
		it('disabling the group disables every member', () => {
			const rb1 = new RadioButton();
			rb1.groupName = 'g_en';
			const rb2 = new RadioButton();
			rb2.groupName = 'g_en';

			expect(rb1.enabled).toBe(true);
			expect(rb2.enabled).toBe(true);

			const group = rb1.group!;
			group.enabled = false;

			expect(rb1.enabled).toBe(false);
			expect(rb2.enabled).toBe(false);

			group.enabled = true;
			expect(rb1.enabled).toBe(true);
		});

		it('a disabled group blocks buttonReleased', () => {
			const rb1 = new RadioButton();
			rb1.groupName = 'g_block';
			const group = rb1.group!;
			group.enabled = false;

			(rb1 as unknown as { buttonReleased: () => void }).buttonReleased();
			expect(rb1.selected).toBe(false); // stayed unselected
		});
	});

	describe('selectedValue label fallback', () => {
		it('returns the label when value is empty', () => {
			const rb = new RadioButton();
			rb.groupName = 'g_label';
			rb.value = '';
			rb.label = 'Easy';
			rb.selected = true;

			expect(rb.group!.selectedValue).toBe('Easy');
		});

		it('matches by label when setting selectedValue', () => {
			const rb = new RadioButton();
			rb.groupName = 'g_match';
			rb.value = '';
			rb.label = 'Hard';

			const group = rb.group!;
			group.selectedValue = 'Hard';
			expect(rb.selected).toBe(true);
			expect(group.selection).toBe(rb);
		});
	});

	describe('programmatic deselect clears group selection', () => {
		it('selected = false clears the stale group selection', () => {
			const rb = new RadioButton();
			rb.groupName = 'g_clear';
			rb.selected = true;

			const group = rb.group!;
			expect(group.selection).toBe(rb);

			// Programmatic deselect must clear the group's selection pointer,
			// otherwise selectedValue stays stale.
			rb.selected = false;
			expect(group.selection).toBeUndefined();
			expect(group.selectedValue).toBeUndefined();
		});
	});

	describe('addInstance adopts a pre-selected radio', () => {
		it('a radio already selected when added becomes the group selection', () => {
			const group = new RadioButtonGroup('manual');

			const rb = new RadioButton();
			rb.groupName = 'other'; // put it somewhere first
			rb.selected = true;

			// Now move it into the manual group while already selected.
			rb.group = group;
			expect(group.selection).toBe(rb);
		});
	});
});
