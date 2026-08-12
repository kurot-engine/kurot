import { describe, it, expect } from 'vitest';
import { Component } from '../src/blakron/components/Component.js';
import { Button } from '../src/blakron/components/Button.js';
import { Label } from '../src/blakron/components/Label.js';
import { TextInput } from '../src/blakron/components/TextInput.js';
import { Scroller } from '../src/blakron/components/Scroller.js';
import { ItemRenderer } from '../src/blakron/components/ItemRenderer.js';

/**
 * Verify egret-parity semantics of the `enabled` / `touchEnabled` cycle:
 *
 * 1. Disabled components are excluded from hit-testing (`touchEnabled = false`
 *    at the display-object level) — they never block touches on elements behind
 *    them the way regular Sprite/DisplayObjectContainer descendents do.
 * 2. After re-enable, `touchEnabled` / `touchChildren` are restored to their
 *    pre-disable values.
 */
describe('Component enabled/touchEnabled cycle (egret parity)', () => {
	// Helper: read the display-layer $touchEnabled flag directly.
	function rawTouchEnabled(comp: Component): boolean {
		return !!(comp as unknown as Record<string, unknown>).$touchEnabled;
	}
	function rawTouchChildren(comp: Component): boolean {
		return !!(comp as unknown as Record<string, unknown>)._touchChildren;
	}

	// Group extends Sprite directly (not Component), so it has no `enabled`
	// property — only Component subclasses go through the gesture here.
	const compFactories: [string, () => Component][] = [
		['Component', () => new Component()],
		['Button', () => new Button()],
		['Label', () => new Label()],
		['TextInput', () => new TextInput()],
		['Scroller', () => new Scroller()],
		['ItemRenderer', () => new ItemRenderer()],
	];

	for (const [name, factory] of compFactories) {
		it(`${name}: initial state`, () => {
			const c = factory();
			expect(c.touchEnabled).toBe(true);
			expect(rawTouchEnabled(c)).toBe(true);
		});

		it(`${name}: disable sets display touchEnabled=false`, () => {
			const c = factory();
			c.enabled = false;
			expect(c.enabled).toBe(false);
			expect(rawTouchEnabled(c)).toBe(false);
		});

		it(`${name}: re-enable restores display touchEnabled`, () => {
			const c = factory();
			c.enabled = false;
			c.enabled = true;
			expect(c.enabled).toBe(true);
			expect(rawTouchEnabled(c)).toBe(true);
			expect(c.touchEnabled).toBe(true);
		});

		it(`${name}: disable→enable preserves pre-disable touchEnabled intent`, () => {
			const c = factory();
			c.touchEnabled = false; // user explicitly disables touch
			c.enabled = false;
			c.enabled = true;
			// should respect the user's pre-disable intent
			expect(rawTouchEnabled(c)).toBe(false);
			expect(c.touchEnabled).toBe(false);
		});

		it(`${name}: disable→enable preserves pre-disable touchChildren intent`, () => {
			const c = factory();
			c.touchChildren = false;
			c.enabled = false;
			c.enabled = true;
			expect(rawTouchChildren(c)).toBe(false);
			expect(c.touchChildren).toBe(false);
		});
	}
});
