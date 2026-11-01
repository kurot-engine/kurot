import { afterEach, describe, expect, it, vi } from 'vitest';
import { BitmapData, BitmapFont, BitmapText, Event, IOErrorEvent, Resource, Texture, resource } from '@kurot/core';
import { BitmapLabel } from '../src/kurot/components/BitmapLabel.js';
import { UIContext } from '../src/kurot/core/UIContext.js';

function makeFont(): BitmapFont {
	const canvas = document.createElement('canvas');
	canvas.width = 32;
	canvas.height = 32;
	const texture = new Texture();
	texture.setBitmapData(new BitmapData(canvas));
	return new BitmapFont(texture, {
		frames: { A: { x: 0, y: 0, w: 8, h: 10, sourceW: 10, sourceH: 12 } },
	}, { ownsTexture: false });
}

function deferredFont(): {
	promise: Promise<unknown>;
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
} {
	let resolve!: (value: unknown) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<unknown>((fulfill, fail) => {
		resolve = fulfill;
		reject = fail;
	});
	return { promise, resolve, reject };
}

function pendingLabel(scoped = true): {
	label: BitmapLabel;
	owner: UIContext | undefined;
	pending: ReturnType<typeof deferredFont>;
} {
	const provider = scoped ? new Resource() : resource;
	const pending = deferredFont();
	vi.spyOn(provider, 'get').mockReturnValue(undefined);
	vi.spyOn(provider, 'load').mockReturnValue(pending.promise);
	const owner = scoped ? new UIContext({
		skins: {},
		resource: provider,
		assetAdapter: { getAsset: (source, reply) => reply(undefined, source) },
	}) : undefined;
	const label = owner ? owner.run(() => new BitmapLabel('A')) : new BitmapLabel('A');
	label.font = 'pending-font';
	label.commitProperties();
	expect(provider.load).toHaveBeenCalledExactlyOnceWith('pending-font');
	return { label, owner, pending };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe.each(['global', 'active', 'disposed'] as const)('BitmapLabel %s owner', mode => {
	it.each(['success', 'rejection', 'wrong-type'] as const)('handles a late %s according to owner lifetime', async outcome => {
		const { label, owner, pending } = pendingLabel(mode !== 'global');
		const complete = vi.fn();
		const failed = vi.fn();
		label.addEventListener(Event.COMPLETE, complete);
		label.addEventListener(IOErrorEvent.IO_ERROR, failed);
		if (mode === 'disposed') {
			owner?.dispose();
		}
		const font = makeFont();
		const dispose = vi.spyOn(font, 'dispose');
		if (outcome === 'rejection') {
			pending.reject(new Error('Font request failed'));
		} else {
			pending.resolve(outcome === 'success' ? font : 'not a bitmap font');
		}
		// Flush the resource .then() and its error-reporting .catch(), without timers.
		await Promise.resolve();
		await Promise.resolve();
		const applied = mode !== 'disposed' && outcome === 'success';
		expect(complete).toHaveBeenCalledTimes(applied ? 1 : 0);
		expect(failed).toHaveBeenCalledTimes(mode !== 'disposed' && outcome !== 'success' ? 1 : 0);
		expect([label.textWidth, label.textHeight]).toEqual(applied ? [10, 12] : [0, 0]);
		expect(dispose).not.toHaveBeenCalled();
		owner?.dispose();
	});
});

describe('BitmapLabel superseded font requests', () => {
	it('rechecks context disposal between font validation and error reporting', async () => {
		const { label, owner, pending } = pendingLabel();
		const failed = vi.fn();
		label.addEventListener(IOErrorEvent.IO_ERROR, failed);
		pending.resolve('not a bitmap font');
		await Promise.resolve();
		owner?.dispose();
		await Promise.resolve();
		expect(failed).not.toHaveBeenCalled();
		expect(label.textWidth).toBe(0);
	});

	it.each(['clear', 'direct'] as const)('ignores late success and failure after a %s assignment', async replacement => {
		for (const outcome of ['success', 'rejection', 'wrong-type'] as const) {
			const { label, owner, pending } = pendingLabel();
			label.createChildren();
			const complete = vi.fn();
			const failed = vi.fn();
			label.addEventListener(Event.COMPLETE, complete);
			label.addEventListener(IOErrorEvent.IO_ERROR, failed);
			const current = replacement === 'direct' ? makeFont() : undefined;
			label.font = current;
			if (outcome === 'rejection') {
				pending.reject(new Error('Obsolete font request failed'));
			} else {
				pending.resolve(outcome === 'success' ? makeFont() : 'obsolete wrong type');
			}
			await Promise.resolve();
			await Promise.resolve();
			expect((label.getChildAt(0) as BitmapText).font).toBe(current);
			expect(complete).not.toHaveBeenCalled();
			expect(failed).not.toHaveBeenCalled();
			owner?.dispose();
			vi.restoreAllMocks();
		}
	});
});
