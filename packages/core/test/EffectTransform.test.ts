import { describe, expect, it } from 'vitest';
import { Sprite } from '../src/blakron/display/Sprite.js';
import { Filter } from '../src/blakron/filters/Filter.js';
import { Matrix } from '../src/blakron/geom/Matrix.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';
import { InstructionSet } from '../src/blakron/player/webgl/InstructionSet.js';
import type { WebGLRenderBuffer } from '../src/blakron/player/webgl/WebGLRenderBuffer.js';
import { WebGLRenderer } from '../src/blakron/player/webgl/WebGLRenderer.js';

interface TestTransform {
	a: number;
	b: number;
	c: number;
	d: number;
	tx: number;
	ty: number;
	offsetX: number;
	offsetY: number;
	alpha: number;
	tint: number;
}

function transform(): TestTransform {
	return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0, offsetX: 0, offsetY: 0, alpha: 1, tint: 0xffffff };
}

function updateDirty(renderer: WebGLRenderer, set: InstructionSet): void {
	(renderer as unknown as { _updateDirtyRenderables(value: InstructionSet): void })._updateDirtyRenderables(set);
}

function mockBuffer(): WebGLRenderBuffer {
	return {
		globalMatrix: new Matrix(),
		globalAlpha: 1,
		globalTintColor: 0xffffff,
		hasOffscreenTransform: false,
		offscreenOriginX: 0,
		offscreenOriginY: 0,
		offscreenInverseTransform: new Matrix(),
		filterPadX: 0,
		filterPadY: 0,
	} as WebGLRenderBuffer;
}

describe('effect transform partial updates', () => {
	it('indexes effect push instructions on every production build path', () => {
		const renderer = new WebGLRenderer() as unknown as {
			_buildFilter(obj: Sprite, set: InstructionSet, buffer: WebGLRenderBuffer, x: number, y: number): void;
			_buildClip(obj: Sprite, set: InstructionSet, buffer: WebGLRenderBuffer, x: number, y: number): void;
			_buildScrollRect(obj: Sprite, set: InstructionSet, buffer: WebGLRenderBuffer, x: number, y: number): void;
		};
		const filtered = new Sprite();
		filtered.filters = [new Filter()];
		const clipped = new Sprite();
		const scrolled = new Sprite();
		scrolled.scrollRect = new Rectangle(0, 0, 20, 20);
		const filterSet = new InstructionSet();
		const clipSet = new InstructionSet();
		const scrollSet = new InstructionSet();

		renderer._buildFilter(filtered, filterSet, mockBuffer(), 0, 0);
		renderer._buildClip(clipped, clipSet, mockBuffer(), 0, 0);
		renderer._buildScrollRect(scrolled, scrollSet, mockBuffer(), 0, 0);

		expect(filterSet.renderableIndex.get(filtered)).toBe(0);
		expect(clipSet.renderableIndex.get(clipped)).toBe(0);
		expect(scrollSet.renderableIndex.get(scrolled)).toBe(0);
	});

	it('updates filter push and leaf snapshots associated with the same object', () => {
		const renderer = new WebGLRenderer();
		const set = new InstructionSet();
		const obj = new Sprite();
		const filterTransform = transform();
		const leafTransform = transform();
		set.addIndexed({
			renderPipeId: 'filterPush',
			renderable: obj,
			filters: [],
			offsetX: 0,
			offsetY: 0,
			savedBlendMode: 'source-over',
			transform: filterTransform,
		} as never);
		set.addLeaf({ renderPipeId: 'graphics', renderable: obj, transform: leafTransform } as never);

		obj.x = 32;
		obj.y = 17;
		obj.scaleX = 1.5;
		obj.alpha = 0.6;
		set.markRenderableDirty(obj);
		updateDirty(renderer, set);

		for (const snapshot of [filterTransform, leafTransform]) {
			expect(snapshot.tx).toBeCloseTo(obj.$getConcatenatedMatrix().tx);
			expect(snapshot.ty).toBeCloseTo(obj.$getConcatenatedMatrix().ty);
			expect(snapshot.a).toBeCloseTo(obj.$getConcatenatedMatrix().a);
			expect(snapshot.alpha).toBeCloseTo(0.6);
		}
	});

	it('updates scrollRect/mask push and descendant snapshots together', () => {
		const renderer = new WebGLRenderer();
		const set = new InstructionSet();
		const viewport = new Sprite();
		const child = new Sprite();
		child.x = 8;
		viewport.addChild(child);
		const maskTransform = transform();
		const childTransform = transform();
		set.addIndexed({
			renderPipeId: 'maskPush',
			renderable: viewport,
			offsetX: 0,
			offsetY: 0,
			isScrollRect: true,
			transform: maskTransform,
		} as never);
		set.addLeaf({ renderPipeId: 'graphics', renderable: child, transform: childTransform } as never);

		viewport.x = 45;
		viewport.scaleY = 1.25;
		viewport.alpha = 0.7;
		set.markRenderableDirty(viewport);
		updateDirty(renderer, set);

		expect(maskTransform.tx).toBeCloseTo(viewport.$getConcatenatedMatrix().tx);
		expect(maskTransform.d).toBeCloseTo(viewport.$getConcatenatedMatrix().d);
		expect(maskTransform.alpha).toBeCloseTo(0.7);
		expect(childTransform.tx).toBeCloseTo(child.$getConcatenatedMatrix().tx);
		expect(childTransform.d).toBeCloseTo(child.$getConcatenatedMatrix().d);
		expect(childTransform.alpha).toBeCloseTo(0.7);
	});

	it('removes the outer effect transform while drawing into an offscreen buffer', () => {
		const renderer = new WebGLRenderer() as unknown as {
			_configureOffscreenTransform(buffer: WebGLRenderBuffer, bounds: Rectangle, value: TestTransform): void;
			_applyTransform(buffer: WebGLRenderBuffer, value: TestTransform): void;
		};
		const buffer = mockBuffer();
		const angle = Math.PI / 6;
		const effectTransform: TestTransform = {
			a: Math.cos(angle),
			b: Math.sin(angle),
			c: -Math.sin(angle),
			d: Math.cos(angle),
			tx: 400,
			ty: 250,
			offsetX: 0,
			offsetY: 0,
			alpha: 1,
			tint: 0xffffff,
		};

		renderer._configureOffscreenTransform(buffer, new Rectangle(0, 0, 80, 80), effectTransform);
		renderer._applyTransform(buffer, effectTransform);

		expect(buffer.globalMatrix.a).toBeCloseTo(1);
		expect(buffer.globalMatrix.b).toBeCloseTo(0);
		expect(buffer.globalMatrix.c).toBeCloseTo(0);
		expect(buffer.globalMatrix.d).toBeCloseTo(1);
		expect(buffer.globalMatrix.tx).toBeCloseTo(0);
		expect(buffer.globalMatrix.ty).toBeCloseTo(0);
	});

	it('applies local instruction offsets through rotation and scale', () => {
		const renderer = new WebGLRenderer() as unknown as {
			_applyTransform(buffer: WebGLRenderBuffer, value: TestTransform): void;
		};
		const target = mockBuffer();
		const angle = Math.PI / 6;
		const a = Math.cos(angle) * 1.5;
		const b = Math.sin(angle) * 1.5;
		const c = -Math.sin(angle) * 0.75;
		const d = Math.cos(angle) * 0.75;
		const value: TestTransform = {
			a,
			b,
			c,
			d,
			tx: 440,
			ty: 290,
			offsetX: -40,
			offsetY: -40,
			alpha: 1,
			tint: 0xffffff,
		};

		renderer._applyTransform(target, value);

		expect(target.globalMatrix.tx).toBeCloseTo(440 - a * 40 - c * 40);
		expect(target.globalMatrix.ty).toBeCloseTo(290 - b * 40 - d * 40);
		expect(target.globalMatrix.a * 40 + target.globalMatrix.c * 40 + target.globalMatrix.tx).toBeCloseTo(440);
		expect(target.globalMatrix.b * 40 + target.globalMatrix.d * 40 + target.globalMatrix.ty).toBeCloseTo(290);
	});
});
