/**
 * TextInput regression tests.
 *
 * Verifies prompt/text property caching and forwarding to skin parts,
 * displayAsPassword/maxChars/restrict forwarding, and getCurrentState
 * (normal / normalWithPrompt / disabled).
 */
import { describe, it, expect, vi } from 'vitest';
import { Component, TextInput, EditableText, Label } from '../src/index.js';
import { attachSkin, detachSkin } from './helpers/skin.js';

describe('TextInput', () => {
	it('lays out EditableText with EUI constraints', () => {
		const host = new Component();
		const editable = new EditableText();
		editable.left = 10;
		editable.right = 10;
		editable.verticalCenter = 0;
		editable.height = 24;
		host.addChild(editable);

		host.updateDisplayList(300, 40);

		expect(editable.x).toBe(10);
		expect(editable.y).toBe(8);
		expect(editable.width).toBe(280);
		expect(editable.height).toBe(24);
	});

	describe('property caching before skin part is attached', () => {
		it('caches prompt before promptDisplay is attached', () => {
			const ti = new TextInput();
			ti.prompt = 'Enter name';
			expect(ti.prompt).toBe('Enter name');
		});

		it('caches text before textDisplay is attached', () => {
			const ti = new TextInput();
			ti.text = 'hello';
			expect(ti.text).toBe('hello');
		});

		it('caches displayAsPassword before textDisplay is attached', () => {
			const ti = new TextInput();
			ti.displayAsPassword = true;
			expect(ti.displayAsPassword).toBe(true);
		});

		it('caches maxChars before textDisplay is attached', () => {
			const ti = new TextInput();
			ti.maxChars = 10;
			expect(ti.maxChars).toBe(10);
		});
	});

	describe('property forwarding after skin part is attached', () => {
		it('forwards prompt when the skin becomes ready', () => {
			const ti = new TextInput();
			ti.prompt = 'Enter name';

			const label = new Label();
			attachSkin(ti, { promptDisplay: label });
			expect(label.text).toBe('Enter name');
			expect(label.touchEnabled).toBe(false);
		});

		it('forwards text when the skin becomes ready', () => {
			const ti = new TextInput();
			ti.text = 'hello';

			const ed = new EditableText();
			attachSkin(ti, { textDisplay: ed });
			expect(ed.text).toBe('hello');
		});

		it('does not duplicate prompt through the internal EditableText', () => {
			const ti = new TextInput();
			ti.prompt = 'Enter name';
			const ed = new EditableText();

			attachSkin(ti, { textDisplay: ed });

			expect(ed.prompt).toBe('');
			expect(ed.text).toBe('');
		});

		it('forwards displayAsPassword when the skin becomes ready', () => {
			const ti = new TextInput();
			ti.displayAsPassword = true;

			const ed = new EditableText();
			attachSkin(ti, { textDisplay: ed });
			expect(ed.displayAsPassword).toBe(true);
		});

		it('reads back from textDisplay after attachment', () => {
			const ti = new TextInput();
			const ed = new EditableText();
			attachSkin(ti, { textDisplay: ed });

			ed.text = 'typed text';
			expect(ti.text).toBe('typed text');
		});

		it('removes EditableText listeners when the complete skin is detached', () => {
			const ti = new TextInput();
			const ed = new EditableText();
			const removeEventListener = vi.spyOn(ed, 'removeEventListener');
			attachSkin(ti, { textDisplay: ed });

			detachSkin(ti);

			expect(removeEventListener).toHaveBeenCalledWith('focusIn', expect.any(Function));
			expect(removeEventListener).toHaveBeenCalledWith('focusOut', expect.any(Function));
			expect(ti.textDisplay).toBeUndefined();
		});
	});

	describe('focus', () => {
		it('allows direct EditableText touches to reach its internal input field', () => {
			const editable = new EditableText();
			editable.createChildren();
			editable.updateDisplayList(160, 30);

			expect(editable.touchChildren).toBe(true);
			expect(editable.$hitTest(10, 10)).not.toBe(editable);
		});

		it('forwards a touch on the component to the editable skin part', () => {
			const ti = new TextInput();
			const ed = new EditableText();
			let focused = false;
			ed.setFocus = (): void => {
				focused = true;
			};
			attachSkin(ti, { textDisplay: ed });

			ti.dispatchEventWith('touchTap');

			expect(focused).toBe(true);
		});
	});

	describe('getCurrentState', () => {
		it('returns "normal" by default', () => {
			const ti = new TextInput();
			expect((ti as unknown as { getCurrentState: () => string }).getCurrentState()).toBe('normal');
		});

		it('returns "disabled" when not enabled', () => {
			const ti = new TextInput();
			ti.enabled = false;
			expect((ti as unknown as { getCurrentState: () => string }).getCurrentState()).toBe('disabled');
		});

		it('returns "normalWithPrompt" when prompt set, no text, not focused, and skin supports it', () => {
			const ti = new TextInput();
			ti.prompt = 'placeholder';
			Object.defineProperty(ti, 'skin', { value: { hasState: () => true }, configurable: true });
			expect((ti as unknown as { getCurrentState: () => string }).getCurrentState()).toBe('normalWithPrompt');
		});

		it('falls back to "normal" when skin lacks normalWithPrompt', () => {
			const ti = new TextInput();
			ti.prompt = 'placeholder';
			Object.defineProperty(ti, 'skin', {
				value: { hasState: (s: string) => s !== 'normalWithPrompt' },
				configurable: true,
			});
			expect((ti as unknown as { getCurrentState: () => string }).getCurrentState()).toBe('normal');
		});
	});
});
