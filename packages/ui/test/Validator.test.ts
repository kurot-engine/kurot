import { afterEach, describe, expect, it, vi } from 'vitest';
import { Validator } from '../src/blakron/core/Validator.js';

describe('Validator error recovery', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('restores validation state when a client throws', () => {
		vi.useFakeTimers();
		const validator = new Validator();
		const client = {
			$nestLevel: 1,
			stage: {},
			validateProperties(): void {
				throw new Error('commit failed');
			},
			validateSize(): void {},
			validateDisplayList(): void {},
		} as never;

		validator.invalidateProperties(client);
		expect(() => validator.validateClient(client)).toThrow('commit failed');

		const state = validator as unknown as { _targetLevel: number; _propsFlag: boolean };
		expect(state._targetLevel).toBe(Infinity);
		expect(state._propsFlag).toBe(false);
	});
});
