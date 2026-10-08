import { afterEach, describe, expect, it, vi } from 'vitest';
import { BitmapFont, BitmapText, BitmapData, Texture, Event, IOErrorEvent, resource } from '@kurot/core';
import { BitmapLabel } from '../src/index.js';
import { PropertyEvent } from '../src/kurot/events/PropertyEvent.js';

function makeFont(): BitmapFont {
	const canvas = document.createElement('canvas');
	canvas.width = 32;
	canvas.height = 32;
	const texture = new Texture();
	texture.setBitmapData(new BitmapData(canvas));
	return new BitmapFont(
		texture,
		{ frames: { A: { x: 0, y: 0, w: 8, h: 10, sourceW: 10, sourceH: 12 } } },
		{ ownsTexture: false },
	);
}
afterEach(() => vi.restoreAllMocks());

describe('BitmapLabel', () => {
	it('reports a cached resource of the wrong type without throwing', () => {
		vi.spyOn(resource, 'get').mockReturnValue('wrong type');
		const label = new BitmapLabel('A');
		const failed = vi.fn();
		label.addEventListener(IOErrorEvent.IO_ERROR, failed);
		label.font = 'bad';
		expect(() => label.commitProperties()).not.toThrow();
		expect(failed).toHaveBeenCalledOnce();
	});
	it('measures content and restores the text field constraints', () => {
		const label = new BitmapLabel('AA');
		label.font = makeFont();
		label.createChildren();
		const text = label.getChildAt(0) as BitmapText;
		text.width = 80;
		text.height = 24;
		label.measure();
		expect([label.textWidth, label.textHeight]).toEqual([20, 12]);
		expect([text.$explicitWidth, text.$explicitHeight]).toEqual([80, 24]);
	});
	it('wraps under layout constraints and keeps one-line mode unwrapped', () => {
		const label = new BitmapLabel('AA');
		label.font = makeFont();
		label.setLayoutBoundsSize(10, NaN);
		expect(label.textHeight).toBe(24);
		label.multiline = false;
		expect(label.textHeight).toBe(12);
		expect(label.textWidth).toBe(20);
	});
	it('uses maximum width for automatic sizing and remeasures after bounds change', () => {
		const label = new BitmapLabel('AAAA');
		label.font = makeFont();
		label.maxWidth = 20;
		label.validateNow();

		expect([label.textWidth, label.textHeight]).toEqual([20, 24]);
		expect([label.width, label.height]).toEqual([20, 24]);
		label.maxWidth = 40;
		label.validateNow();
		expect([label.width, label.height]).toEqual([40, 12]);
	});
	it('applies actual bounds and alignment without scaling glyphs', () => {
		const label = new BitmapLabel('A');
		label.font = makeFont();
		label.createChildren();
		label.textAlign = 'right';
		label.verticalAlign = 'bottom';
		label.updateDisplayList(30, 24);
		const text = label.getChildAt(0) as BitmapText;
		expect(text.getGlyphs()[0]).toMatchObject({ x: 20, y: 12 });
	});
	it('remeasures automatic height when authored width changes after validation', () => {
		const label = new BitmapLabel('AAAA');
		label.font = makeFont();
		label.width = 20;
		label.validateNow();
		expect(label.height).toBe(24);
		label.width = 40;
		label.validateNow();
		expect([label.width, label.height]).toEqual([40, 12]);
	});
	it('dispatches text changes for binding only when the value changes', () => {
		const label = new BitmapLabel();
		const listener = vi.fn();
		label.addEventListener(PropertyEvent.PROPERTY_CHANGE, listener);
		label.text = 'A';
		label.text = 'A';
		expect(listener).toHaveBeenCalledOnce();
	});
	it('resolves preloaded font names synchronously', () => {
		const font = makeFont();
		vi.spyOn(resource, 'get').mockReturnValue(font);
		const label = new BitmapLabel('AA');
		const complete = vi.fn();
		label.addEventListener(Event.COMPLETE, complete);
		label.font = 'number_font_fnt';
		label.commitProperties();
		expect(label.textWidth).toBe(20);
		expect(complete).toHaveBeenCalledOnce();
	});
	it('loads configured fonts asynchronously and invalidates measurement', async () => {
		vi.spyOn(resource, 'get').mockReturnValue(undefined);
		vi.spyOn(resource, 'load').mockResolvedValue(makeFont());
		const label = new BitmapLabel('A');
		label.font = 'font';
		label.commitProperties();
		await Promise.resolve();
		expect(label.textWidth).toBe(10);
	});
	it('ignores stale A-to-B-to-A asynchronous completions', async () => {
		vi.spyOn(resource, 'get').mockReturnValue(undefined);
		let resolveOld: ((value: unknown) => void) | undefined;
		vi.spyOn(resource, 'load')
			.mockImplementationOnce(
				() =>
					new Promise(resolve => {
						resolveOld = resolve;
					}),
			)
			.mockResolvedValue(makeFont());
		const label = new BitmapLabel('A');
		const complete = vi.fn();
		label.addEventListener(Event.COMPLETE, complete);
		label.font = 'A';
		label.commitProperties();
		label.font = 'B';
		label.commitProperties();
		label.font = 'A';
		label.commitProperties();
		await Promise.resolve();
		resolveOld?.(makeFont());
		await Promise.resolve();
		expect(complete).toHaveBeenCalledOnce();
	});
	it('reports loading errors and clears removed fonts', async () => {
		vi.spyOn(resource, 'get').mockReturnValue(undefined);
		vi.spyOn(resource, 'load').mockRejectedValue(new Error('Missing font'));
		const label = new BitmapLabel('A');
		const failed = vi.fn();
		label.addEventListener(IOErrorEvent.IO_ERROR, failed);
		label.font = 'missing';
		label.commitProperties();
		await Promise.resolve();
		await Promise.resolve();
		expect(failed).toHaveBeenCalledOnce();
		label.font = makeFont();
		expect(label.textWidth).toBe(10);
		label.font = undefined;
		expect(label.textWidth).toBe(0);
	});
});
