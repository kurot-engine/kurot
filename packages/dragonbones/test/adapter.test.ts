import { afterEach, describe, expect, it, vi } from 'vitest';
import { Mesh, Sprite, SpriteSheet, ticker } from '@kurot/core';
import { KurotFactory, KurotArmatureDisplay, dragonBones } from '../src/index.js';
import { makeAtlas, makeSkeleton, makeTexture } from './fixtures.js';
import type { DragonBonesEvent } from '../src/index.js';

const factories: KurotFactory[] = [];

function setup(options: Parameters<typeof makeSkeleton>[0] = {}, autoUpdate = false): KurotFactory {
	const factory = new KurotFactory({ autoUpdate });
	factories.push(factory);
	factory.parseSkeleton(makeSkeleton(options));
	factory.parseAtlas(makeAtlas(), makeTexture());
	return factory;
}

function build(factory: KurotFactory): KurotArmatureDisplay {
	const display = factory.buildArmatureDisplay('main');
	if (!display) throw new Error('Fixture armature was not built.');
	return display;
}

function meshOf(display: KurotArmatureDisplay): Mesh {
	const mesh: unknown = display.armature.getSlot('slot')?.display;
	if (!(mesh instanceof Mesh)) throw new Error('Fixture slot is not a native Kurot mesh.');
	return mesh;
}

afterEach(() => {
	for (const factory of factories.splice(0)) {
		factory.dispose();
	}
	vi.restoreAllMocks();
});

describe('Kurot DragonBones adapter', () => {
	it('keeps runtime exports isolated and pinned to 5.7.000', () => {
		expect(dragonBones.DragonBones.VERSION).toBe('5.7.000');
		expect('dragonBones' in globalThis).toBe(false);
		expect('egret' in globalThis).toBe(false);
	});

	it('renders an image with atlas UVs, bone transform and pivot', () => {
		const factory = setup();
		const mesh = meshOf(build(factory));
		expect(mesh.vertices).toEqual([0, 0, 16, 0, 16, 24, 0, 24]);
		expect(mesh.uvs).toEqual([0, 0, 1, 0, 1, 1, 0, 1]);
		expect(mesh.texture?.bitmapX).toBe(10);
		expect(mesh.anchorOffsetX).toBe(8);
		expect(mesh.anchorOffsetY).toBe(12);
		expect(mesh.matrix.tx).toBe(10);
		expect(mesh.matrix.ty).toBe(20);
		expect(mesh.visible).toBe(true);
	});

	it('preserves rotated and trimmed atlas registration', () => {
		const rotated = meshOf(build(setup({ texture: 'rotated' })));
		expect(rotated.texture?.rotated).toBe(true);
		expect(rotated.vertices).toEqual([0, 0, 12, 0, 12, 8, 0, 8]);
		const trimmed = meshOf(build(setup({ texture: 'trimmed' })));
		expect(trimmed.anchorOffsetX).toBe(12);
		expect(trimmed.anchorOffsetY).toBe(10);
	});

	it('updates unweighted mesh deformation in local coordinates', () => {
		const factory = setup({ mesh: true });
		const display = build(factory);
		const slot = display.armature.getSlot('slot');
		if (!slot?._displayFrame) throw new Error('Missing mesh frame.');
		slot._displayFrame.deformVertices.splice(0, 8, 3, 4, 0, 0, 0, 0, 0, 0);
		slot._verticesDirty = true;
		factory.advanceTime(1 / 60);
		expect(meshOf(display).vertices.slice(0, 2)).toEqual([3, 4]);
		expect(meshOf(display).matrix.tx).toBe(10);
	});

	it('updates weighted vertices in armature coordinates without applying the bone twice', () => {
		const factory = setup({ mesh: true, weighted: true });
		const display = build(factory);
		const mesh = meshOf(display);
		expect(mesh.vertices.slice(0, 2)).toEqual([10, 20]);
		expect(mesh.matrix.tx).toBe(0);
		display.animation.play('move', 1);
		factory.advanceTime(0.25);
		expect(mesh.vertices[0]).toBeGreaterThan(10);
	});

	it('builds nested armatures and releases their displays with the parent', () => {
		const factory = setup({ nested: true });
		const display = build(factory);
		const child = display.armature.getSlot('slot')?.childArmature?.display as KurotArmatureDisplay;
		expect(child).toBeInstanceOf(KurotArmatureDisplay);
		expect(child.parent).toBe(display);
		expect(factory.displayCount).toBe(1);
		display.dispose();
		expect(factory.displayCount).toBe(0);
		expect(child.disposed).toBe(true);
	});

	it('dispatches frame, sound and completion events with matching listener ownership', () => {
		const factory = setup();
		const display = build(factory);
		const events: string[] = [];
		const context = { count: 0 };
		function onComplete(this: typeof context, event: DragonBonesEvent): void {
			this.count++;
			events.push(event.animationName);
		}
		display.addDBEventListener(dragonBones.EventObject.COMPLETE, onComplete, context);
		display.addDBEventListener(dragonBones.EventObject.COMPLETE, onComplete, context);
		display.addDBEventListener(dragonBones.EventObject.FRAME_EVENT, event => events.push(event.name));
		factory.soundEventManager.addDBEventListener(dragonBones.EventObject.SOUND_EVENT, event => events.push(event.name));
		display.animation.play('move', 1);
		factory.advanceTime(0.1);
		factory.advanceTime(1.1);
		expect(events).toContain('marker');
		expect(events).toContain('sound');
		expect(context.count).toBe(1);
		display.removeDBEventListener(dragonBones.EventObject.COMPLETE, onComplete, context);
		expect(display.hasDBEventListener(dragonBones.EventObject.COMPLETE)).toBe(false);
	});

	it('uses tint for multiplication and a native filter for offsets', () => {
		const multiply = meshOf(build(setup({ color: { rM: 50, gM: 100, bM: 100, aM: 50 } })));
		expect(multiply.tint).toBe(0x80ffff);
		expect(multiply.alpha).toBe(0.5);
		const offset = meshOf(build(setup({ color: { rO: 20 } })));
		expect(offset.filters).toHaveLength(1);
	});

	it('registers one ticker per factory and removes it after the last display', () => {
		const start = vi.spyOn(ticker, 'startTick');
		const stop = vi.spyOn(ticker, 'stopTick');
		const factory = setup({}, true);
		const first = build(factory);
		const second = build(factory);
		expect(start).toHaveBeenCalledTimes(1);
		first.dispose();
		expect(stop).not.toHaveBeenCalled();
		second.dispose();
		expect(stop).toHaveBeenCalledTimes(1);
	});

	it('allows disposal from a completion callback and flushes deferred pool returns', () => {
		const factory = setup();
		const display = build(factory);
		display.addDBEventListener(dragonBones.EventObject.COMPLETE, () => display.dispose());
		display.animation.play('move', 1);
		expect(() => factory.advanceTime(1.1)).not.toThrow();
		expect(display.numChildren).toBe(0);
		expect(factory.displayCount).toBe(0);
	});

	it('allows factory disposal from a completion callback', () => {
		const factory = setup();
		const display = build(factory);
		display.addDBEventListener(dragonBones.EventObject.COMPLETE, () => factory.dispose());
		display.animation.play('move', 1);
		factory.advanceTime(1.1);
		expect(factory.disposed).toBe(true);
	});

	it('keeps caller-owned atlas pages alive and rejects destructive clear while in use', () => {
		const factory = setup();
		const page = makeTexture();
		factory.parseAtlas(makeAtlas(), page, 'second');
		const display = build(factory);
		const host = new Sprite();
		host.addChild(display);
		expect(() => factory.clear()).toThrow('Dispose armature displays');
		factory.dispose();
		expect(page.bitmapData).toBeDefined();
		expect(host.numChildren).toBe(0);
		expect(() => factory.buildArmatureDisplay('main')).toThrow('disposed');
		expect(factory.disposed).toBe(true);
	});

	it('handles missing armatures and rejects invalid time deltas', () => {
		const factory = setup();
		expect(factory.buildArmatureDisplay('missing')).toBeUndefined();
		expect(() => factory.advanceTime(-1)).toThrow(RangeError);
		expect(() => factory.advanceTime(Number.NaN)).toThrow(RangeError);
	});

	it('applies skeleton scale once to image geometry, pivots and bone translation', () => {
		const factory = new KurotFactory({ autoUpdate: false });
		factories.push(factory);
		factory.parseSkeleton(makeSkeleton(), 'scaled', 0.5);
		factory.parseAtlas(makeAtlas(), makeTexture(), 'scaled');
		const mesh = meshOf(build(factory));
		expect(mesh.vertices).toEqual([0, 0, 8, 0, 8, 12, 0, 12]);
		expect(mesh.anchorOffsetX).toBe(4);
		expect(mesh.anchorOffsetY).toBe(6);
		expect(mesh.matrix.tx).toBe(5);
		expect(mesh.matrix.ty).toBe(10);
	});

	it('rejects cropped atlas pages even when the crop starts at the origin', () => {
		const factory = setup();
		const crop = new SpriteSheet(makeTexture()).createTexture('crop', 0, 0, 16, 16);
		expect(() => factory.parseAtlas(makeAtlas(), crop)).toThrow('complete');
	});

	it('replaces atlas regions without disposing either borrowed page', () => {
		const factory = setup();
		const display = build(factory);
		const mesh = meshOf(display);
		const original = mesh.texture?.bitmapData;
		const replacement = makeTexture();
		display.armature.replacedTexture = replacement;
		factory.advanceTime(1 / 60);
		expect(mesh.texture?.bitmapData).toBe(replacement.bitmapData);
		display.dispose();
		expect(replacement.bitmapData).toBeDefined();
		expect(original?.source).toBeDefined();
	});

	it('hides and restores slot attachments and accepts native custom displays', () => {
		const factory = setup();
		const display = build(factory);
		const slot = display.armature.getSlot('slot');
		if (!slot) throw new Error('Missing fixture slot.');
		const mesh = meshOf(display);
		slot.displayIndex = -1;
		factory.advanceTime(1 / 60);
		expect(mesh.visible).toBe(false);
		slot.displayIndex = 0;
		factory.advanceTime(1 / 60);
		expect(mesh.visible).toBe(true);
		const custom = new Sprite();
		slot.display = custom;
		factory.advanceTime(1 / 60);
		expect(custom.parent).toBe(display);
		expect(custom.matrix.tx).toBe(10);
		expect(mesh.parent).toBeUndefined();
	});

	it('converts ticker milliseconds to seconds and resets time when changing drivers', () => {
		const start = vi.spyOn(ticker, 'startTick');
		const stop = vi.spyOn(ticker, 'stopTick');
		const factory = setup({}, true);
		const display = build(factory);
		display.animation.play('move', 1);
		const callback = start.mock.calls[0][0];
		callback.call(factory, 1000);
		callback.call(factory, 1250);
		expect(display.animation.lastAnimationState?.currentTime).toBeCloseTo(0.25);
		factory.autoUpdate = false;
		expect(stop).toHaveBeenCalledTimes(1);
		factory.advanceTime(0.1);
		factory.autoUpdate = true;
		callback.call(factory, 5000);
		expect(display.animation.lastAnimationState?.currentTime).toBeCloseTo(0.35);
	});

	it('keeps scalar event snapshots valid after upstream event pooling', () => {
		const factory = setup();
		const display = build(factory);
		let saved: DragonBonesEvent | undefined;
		display.addDBEventListener(dragonBones.EventObject.FRAME_EVENT, event => {
			saved = event;
		});
		display.animation.play('move', 1);
		factory.advanceTime(0.1);
		factory.advanceTime(0.1);
		expect(saved?.name).toBe('marker');
		expect(saved?.animationName).toBe('move');
	});
});
