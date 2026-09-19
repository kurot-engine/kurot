import { afterEach, describe, expect, it, vi } from 'vitest';
import { ticker } from '@kurot/core';
import { Validator } from '../src/kurot/core/Validator.js';

describe('Validator', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('flushes each validation phase through the core render scheduler', () => {
		let scheduled: (() => void) | undefined;
		const callLater = vi.spyOn(ticker, 'callLater').mockImplementation((callback, ...args) => {
			scheduled = () => callback(...args);
		});
		const calls: string[] = [];
		const validator = new Validator();
		const client = {
			$nestLevel: 1,
			stage: {},
			validateProperties(): void {
				calls.push('properties');
			},
			validateSize(): void {
				calls.push('size');
			},
			validateDisplayList(): void {
				calls.push('display');
			},
		} as never;

		validator.invalidateProperties(client);
		validator.invalidateSize(client);
		validator.invalidateDisplayList(client);

		expect(callLater).toHaveBeenCalledOnce();
		expect(calls).toEqual([]);
		expect(scheduled).toBeDefined();

		scheduled?.();

		expect(calls).toEqual(['properties', 'size', 'display']);
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
