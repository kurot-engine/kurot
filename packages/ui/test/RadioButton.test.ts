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
import { RadioButton, RadioButtonGroup } from '../src/index.js';

describe('RadioButton / RadioButtonGroup', () => {
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
