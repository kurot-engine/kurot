import { describe, it, expect, vi } from 'vitest';
import { Skin } from '../src/blakron/components/Skin.js';
import { State } from '../src/blakron/states/State.js';
import type { IOverride } from '../src/blakron/states/IOverride.js';
import { PropertyEvent } from '../src/blakron/events/PropertyEvent.js';

/** Records apply/remove calls so we can assert state-transition behaviour. */
class RecordingOverride implements IOverride {
	public applyCalls = 0;
	public removeCalls = 0;
	apply(): void {
		this.applyCalls++;
	}
	remove(): void {
		this.removeCalls++;
	}
}

function createActiveHost(): never {
	return {
		stage: {},
		addEventListener(): void {},
		removeEventListener(): void {},
		once(): void {},
	} as never;
}

describe('Skin', () => {
	describe('hasState', () => {
		it('returns true only for declared states', () => {
			const skin = new Skin();
			skin.states = [new State('up'), new State('down')];

			expect(skin.hasState('up')).toBe(true);
			expect(skin.hasState('down')).toBe(true);
			expect(skin.hasState('disabled')).toBe(false);
		});

		it('returns false when no states are declared', () => {
			const skin = new Skin();
			expect(skin.hasState('up')).toBe(false);
		});
	});

	describe('getPart', () => {
		it('reads a named property off the skin instance', () => {
			const skin = new Skin();
			(skin as unknown as Record<string, unknown>).labelDisplay = 'a-label';

			expect(skin.getPart('labelDisplay')).toBe('a-label');
			expect(skin.getPart('nonexistent')).toBeUndefined();
		});
	});

	describe('elementsContent', () => {
		it('defaults to an empty array and accepts assignment', () => {
			const skin = new Skin();
			expect(skin.elementsContent).toEqual([]);

			const arr = [{}] as never;
			skin.elementsContent = arr;
			expect(skin.elementsContent).toBe(arr);
		});

		it('coerces null/undefined to an empty array', () => {
			const skin = new Skin();
			skin.elementsContent = undefined as never;
			expect(skin.elementsContent).toEqual([]);
		});
	});

	describe('currentState transitions', () => {
		it('applies overrides of the new state and removes overrides of the old state', () => {
			const upOverride = new RecordingOverride();
			const downOverride = new RecordingOverride();
			const skin = new Skin();
			skin.states = [new State('up', [upOverride]), new State('down', [downOverride])];
			skin.hostComponent = createActiveHost();

			// Enter "up": its overrides are applied.
			skin.currentState = 'up';
			expect(upOverride.applyCalls).toBe(1);
			expect(downOverride.applyCalls).toBe(0);

			// Switch to "down": up overrides removed, down overrides applied.
			skin.currentState = 'down';
			expect(upOverride.removeCalls).toBe(1);
			expect(downOverride.applyCalls).toBe(1);
		});

		it('does nothing when set to the same state', () => {
			const override = new RecordingOverride();
			const skin = new Skin();
			skin.states = [new State('up', [override])];
			skin.hostComponent = createActiveHost();

			skin.currentState = 'up';
			expect(override.applyCalls).toBe(1);

			skin.currentState = 'up';
			expect(override.applyCalls).toBe(1);
		});

		it('is a no-op when no states are declared', () => {
			const skin = new Skin();
			expect(() => {
				skin.currentState = 'whatever';
			}).not.toThrow();
		});
	});

	describe('hostComponent', () => {
		it('removes the active state when detached and reapplies it when reused', () => {
			const stateOverride = new RecordingOverride();
			const skin = new Skin();
			skin.states = [new State('up', [stateOverride])];
			skin.currentState = 'up';

			const firstHost = createActiveHost();
			skin.hostComponent = firstHost;
			expect(stateOverride.applyCalls).toBe(1);

			skin.hostComponent = undefined;
			expect(stateOverride.removeCalls).toBe(1);

			skin.hostComponent = createActiveHost();
			expect(stateOverride.applyCalls).toBe(2);
		});

		it('dispatches PropertyEvent when hostComponent changes', () => {
			const skin = new Skin();
			// Minimal host stub: the setter touches removeEventListener / stage / once.
			const host = {
				stage: undefined,
				addEventListener(): void {},
				removeEventListener(): void {},
				once(): void {},
			} as never;

			const handler = vi.fn();
			skin.addEventListener(PropertyEvent.PROPERTY_CHANGE, handler);

			skin.hostComponent = host;

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler.mock.calls[0][0]).toBeInstanceOf(PropertyEvent);
			expect(handler.mock.calls[0][0].property).toBe('hostComponent');
		});

		it('does not dispatch when set to the same value', () => {
			const skin = new Skin();

			const handler = vi.fn();
			skin.addEventListener(PropertyEvent.PROPERTY_CHANGE, handler);

			// undefined is already the default, so no change → no dispatch.
			skin.hostComponent = undefined;
			expect(handler).not.toHaveBeenCalled();
		});
	});
});
