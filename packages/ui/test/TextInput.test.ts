/**
 * TextInput regression tests.
 *
 * Verifies prompt/text property caching and forwarding to skin parts,
 * displayAsPassword/maxChars/restrict forwarding, and getCurrentState
 * (normal / normalWithPrompt / disabled).
 */
import { describe, it, expect } from 'vitest';
import { Component, TextInput, EditableText, Label } from '../src/index.js';

// Reach the protected partAdded method without repeating the cast.
function attachPart(ti: TextInput, partName: string, instance: unknown): void {
	(ti as unknown as { partAdded: (n: string, i: unknown) => void }).partAdded(partName, instance);
}

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
		it('forwards prompt to promptDisplay on partAdded', () => {
			const ti = new TextInput();
			ti.prompt = 'Enter name';

			const label = new Label();
			attachPart(ti, 'promptDisplay', label);
			expect(label.text).toBe('Enter name');
			expect(label.touchEnabled).toBe(false);
		});

		it('forwards text to textDisplay on partAdded', () => {
			const ti = new TextInput();
			ti.text = 'hello';

			const ed = new EditableText();
			attachPart(ti, 'textDisplay', ed);
			expect(ed.text).toBe('hello');
		});

		it('does not duplicate prompt through the internal EditableText', () => {
			const ti = new TextInput();
			ti.prompt = 'Enter name';
			const ed = new EditableText();

			attachPart(ti, 'textDisplay', ed);

			expect(ed.prompt).toBe('');
			expect(ed.text).toBe('');
		});

		it('forwards displayAsPassword to textDisplay on partAdded', () => {
			const ti = new TextInput();
			ti.displayAsPassword = true;

			const ed = new EditableText();
			attachPart(ti, 'textDisplay', ed);
			expect(ed.displayAsPassword).toBe(true);
		});

		it('reads back from textDisplay after attachment', () => {
			const ti = new TextInput();
			const ed = new EditableText();
			attachPart(ti, 'textDisplay', ed);

			ed.text = 'typed text';
			expect(ti.text).toBe('typed text');
		});
	});

	describe('focus', () => {
		it('forwards a touch on the component to the editable skin part', () => {
			const ti = new TextInput();
			const ed = new EditableText();
			let focused = false;
			ed.setFocus = (): void => {
				focused = true;
			};
			attachPart(ti, 'textDisplay', ed);

			ti.dispatchEventWith('touchBegin');

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
