import { describe, it, expect } from 'vitest';
import { Event } from '@blakron/core';
import { Group } from '../src/blakron/components/Group.js';
import { Button } from '../src/blakron/components/Button.js';
import { PropertyEvent } from '../src/blakron/events/PropertyEvent.js';

/**
 * Regression guard for the EventMap override added to Component and Group.
 * The override is pure type-level scaffolding (it forwards to super), but
 * if the overload/impl signatures drift, listeners silently fail to register
 * or fail to be removed. These tests pin the runtime contract.
 */
describe('EventMap override runtime contract', () => {
	describe('Component (Button) addEventListener / removeEventListener', () => {
		it('registers and fires a listener for a base Event type', () => {
			const btn = new Button();
			let calls = 0;
			const handler = (): void => {
				calls++;
			};
			btn.addEventListener(Event.CHANGE, handler);

			btn.dispatchEventWith(Event.CHANGE);
			expect(calls).toBe(1);

			btn.removeEventListener(Event.CHANGE, handler);
			btn.dispatchEventWith(Event.CHANGE);
			expect(calls).toBe(1);
		});

		it('registers and fires a listener for PropertyEvent', () => {
			const btn = new Button();
			let received: PropertyEvent | undefined;
			const handler = (e: PropertyEvent): void => {
				received = e;
			};
			btn.addEventListener(PropertyEvent.PROPERTY_CHANGE, handler);

			PropertyEvent.dispatchPropertyEvent(btn, 'selected');
			expect(received).toBeInstanceOf(PropertyEvent);
			expect(received?.property).toBe('selected');

			btn.removeEventListener(PropertyEvent.PROPERTY_CHANGE, handler);
			received = undefined;
			PropertyEvent.dispatchPropertyEvent(btn, 'selected');
			expect(received).toBeUndefined();
		});
	});

	describe('Group addEventListener / removeEventListener', () => {
		it('registers and fires a listener for PropertyEvent', () => {
			const g = new Group();
			let received: PropertyEvent | undefined;
			const handler = (e: PropertyEvent): void => {
				received = e;
			};
			g.addEventListener(PropertyEvent.PROPERTY_CHANGE, handler);

			PropertyEvent.dispatchPropertyEvent(g, 'scrollH');
			expect(received).toBeInstanceOf(PropertyEvent);
			expect(received?.property).toBe('scrollH');

			g.removeEventListener(PropertyEvent.PROPERTY_CHANGE, handler);
			received = undefined;
			PropertyEvent.dispatchPropertyEvent(g, 'scrollH');
			expect(received).toBeUndefined();
		});

		it('removeEventListener with no prior registration is a safe no-op', () => {
			const g = new Group();
			expect(() => {
				g.removeEventListener(Event.CHANGE, () => undefined);
			}).not.toThrow();
		});
	});
});
