import { describe, expect, it, vi } from 'vitest';
import { IOErrorEvent } from '@blakron/core';
import { Component } from '../src/blakron/components/Component.js';
import { Theme } from '../src/blakron/core/Theme.js';
import type { IThemeAdapter } from '../src/blakron/core/IThemeAdapter.js';

describe('Theme failure lifecycle', () => {
	it('dispatches IO_ERROR and releases delayed components after a load failure', () => {
		let fail!: (error: unknown) => void;
		const adapter: IThemeAdapter = {
			getTheme(_url, _success, onError): void {
				fail = onError;
			},
		};
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const theme = new Theme('missing.thm.json', adapter);
		const component = new Component();
		theme.getSkinName(component);
		const onError = vi.fn();
		theme.addEventListener(IOErrorEvent.IO_ERROR, onError);

		fail(new Error('missing'));

		expect(onError).toHaveBeenCalledTimes(1);
		expect((theme as unknown as { _initialized: boolean })._initialized).toBe(true);
		expect((theme as unknown as { _delayList: Component[] })._delayList).toHaveLength(0);
		errorSpy.mockRestore();
	});

	it('dispatches IO_ERROR for invalid theme JSON', () => {
		let succeed!: (data: unknown) => void;
		const adapter: IThemeAdapter = {
			getTheme(_url, onSuccess): void {
				succeed = onSuccess;
			},
		};
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const theme = new Theme('invalid.thm.json', adapter);
		const onError = vi.fn();
		theme.addEventListener(IOErrorEvent.IO_ERROR, onError);

		succeed('{invalid');

		expect(onError).toHaveBeenCalledTimes(1);
		errorSpy.mockRestore();
	});
});
