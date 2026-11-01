import { afterEach, describe, expect, it, vi } from 'vitest';
import { BitmapData, Event, Texture } from '@kurot/core';
import { Image } from '../src/kurot/components/Image.js';
import { UIContext } from '../src/kurot/core/UIContext.js';
import { getAssetAdapter, setAssetAdapter } from '../src/kurot/core/AssetAdapterRegistry.js';
import type { IAssetAdapter } from '../src/kurot/core/IAssetAdapter.js';

const originalAdapter = getAssetAdapter();
type AssetReply = Parameters<IAssetAdapter['getAsset']>[1];

function texture(width: number, height: number): Texture {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const result = new Texture();
	result.setBitmapData(new BitmapData(canvas));
	return result;
}

function pendingImage(scoped = true): {
	image: Image;
	requests: { source: string; reply: AssetReply }[];
	owner: UIContext | undefined;
} {
	const requests: { source: string; reply: AssetReply }[] = [];
	const adapter: IAssetAdapter = {
		getAsset(source, reply) {
			requests.push({ source, reply });
		},
	};
	const owner = scoped ? new UIContext({ skins: {}, assetAdapter: adapter }) : undefined;
	if (!owner) {
		setAssetAdapter(adapter);
	}
	return { image: owner ? owner.run(() => new Image()) : new Image(), requests, owner };
}

afterEach(() => {
	setAssetAdapter(originalAdapter);
	vi.restoreAllMocks();
});

describe('Image source requests', () => {
	it.each([false, true])('keeps the newest A reply after A-to-B-to-A changes (scoped=%s)', scoped => {
		const { image, requests, owner } = pendingImage(scoped);
		const complete = vi.fn();
		image.addEventListener(Event.COMPLETE, complete);
		for (const source of ['A', 'B', 'A']) {
			image.source = source;
			image.commitProperties();
		}
		expect(requests.map(request => request.source)).toEqual(['A', 'B', 'A']);
		const newest = texture(32, 16);
		requests[2].reply(newest, 'A');
		expect(image.bitmap?.texture).toBe(newest);
		expect(complete).toHaveBeenCalledOnce();
		const stale = texture(8, 4);
		const dispose = vi.spyOn(stale, 'dispose');
		requests[1].reply(texture(16, 8), 'B');
		requests[0].reply(stale, 'A');
		expect(image.bitmap?.texture).toBe(newest);
		expect([image.bitmap?.texture?.textureWidth, image.bitmap?.texture?.textureHeight]).toEqual([32, 16]);
		expect(complete).toHaveBeenCalledOnce();
		expect(dispose).not.toHaveBeenCalled();
		owner?.dispose();
	});

	it.each(['string', 'clear', 'texture'] as const)(
		'invalidates old A immediately when %s is assigned before the next property commit',
		kind => {
			const { image, requests, owner } = pendingImage();
			const complete = vi.fn();
			image.addEventListener(Event.COMPLETE, complete);
			image.source = 'A';
			image.commitProperties();
			const direct = kind === 'texture' ? texture(16, 8) : undefined;
			image.source = kind === 'string' ? 'B' : direct;
			image.source = 'A';
			requests[0].reply(texture(8, 4), 'A');
			expect(image.bitmap?.texture).toBe(direct);
			expect(complete).not.toHaveBeenCalled();
			image.commitProperties();
			expect(requests.map(request => request.source)).toEqual(['A', 'A']);
			const latest = texture(32, 16);
			requests[1].reply(latest, 'A');
			expect(image.bitmap?.texture).toBe(latest);
			expect(complete).toHaveBeenCalledOnce();
			owner?.dispose();
		},
	);

	it('ignores an obsolete undefined reply instead of clearing a newer texture', () => {
		const { image, requests, owner } = pendingImage();
		const complete = vi.fn();
		image.addEventListener(Event.COMPLETE, complete);
		for (const source of ['A', 'B', 'A']) {
			image.source = source;
			image.commitProperties();
		}
		const current = texture(32, 16);
		requests[2].reply(current, 'A');
		requests[0].reply(undefined, 'A');
		expect(image.bitmap?.texture).toBe(current);
		expect(complete).toHaveBeenCalledOnce();
		owner?.dispose();
	});

	it.each([false, true])('only applies replies for an active context (disposed=%s)', disposed => {
		const { image, requests, owner } = pendingImage();
		const complete = vi.fn();
		image.addEventListener(Event.COMPLETE, complete);
		image.source = 'A';
		image.commitProperties();
		if (disposed) {
			owner?.dispose();
		}
		const result = texture(32, 16);
		const dispose = vi.spyOn(result, 'dispose');
		requests[0].reply(result, 'A');
		expect(image.bitmap?.texture).toBe(disposed ? undefined : result);
		expect(complete).toHaveBeenCalledTimes(disposed ? 0 : 1);
		expect(dispose).not.toHaveBeenCalled();
		owner?.dispose();
	});

	it('applies direct textures synchronously and clears without loading or COMPLETE', () => {
		const { image, requests, owner } = pendingImage();
		const complete = vi.fn();
		image.addEventListener(Event.COMPLETE, complete);
		const direct = texture(16, 8);
		image.source = direct;
		expect(image.bitmap?.texture).toBe(direct);
		image.source = undefined;
		expect(image.bitmap?.texture).toBeUndefined();
		expect(requests).toHaveLength(0);
		expect(complete).not.toHaveBeenCalled();
		owner?.dispose();
	});

	it('accepts synchronous global adapter replies without reloading an unchanged source', () => {
		const result = texture(16, 8);
		const getAsset = vi.fn<IAssetAdapter['getAsset']>((source, reply) => {
			reply(result, source);
		});
		setAssetAdapter({ getAsset });
		const image = new Image('A');
		const complete = vi.fn();
		image.addEventListener(Event.COMPLETE, complete);
		image.commitProperties();
		image.source = 'A';
		image.commitProperties();
		expect(image.bitmap?.texture).toBe(result);
		expect(getAsset).toHaveBeenCalledOnce();
		expect(complete).toHaveBeenCalledOnce();
	});

	it('keeps the pending request valid when the same source is assigned again', () => {
		const { image, requests, owner } = pendingImage();
		const complete = vi.fn();
		image.addEventListener(Event.COMPLETE, complete);
		image.source = 'A';
		image.commitProperties();
		image.source = 'A';
		image.commitProperties();
		expect(requests).toHaveLength(1);
		const result = texture(16, 8);
		requests[0].reply(result, 'A');
		expect(image.bitmap?.texture).toBe(result);
		expect(complete).toHaveBeenCalledOnce();
		owner?.dispose();
	});

	it('clears an earlier texture on the current adapter undefined reply without COMPLETE', () => {
		const { image, requests, owner } = pendingImage();
		image.source = texture(16, 8);
		const complete = vi.fn();
		image.addEventListener(Event.COMPLETE, complete);
		image.source = 'missing';
		image.commitProperties();
		requests[0].reply(undefined, 'missing');
		expect(image.bitmap?.texture).toBeUndefined();
		expect(complete).not.toHaveBeenCalled();
		owner?.dispose();
	});
});
