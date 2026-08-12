import { describe, expect, it } from 'vitest';
import { Bitmap } from '../src/blakron/display/Bitmap.js';
import { DisplayObjectContainer } from '../src/blakron/display/DisplayObjectContainer.js';
import { Sprite } from '../src/blakron/display/Sprite.js';
import { Matrix } from '../src/blakron/geom/Matrix.js';
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

interface RendererInternals {
	_instructionSet: InstructionSet;
	_renderGroupSets: WeakMap<DisplayObjectContainer, InstructionSet>;
	_updateDirtyRenderables(set: InstructionSet): void;
	_prepareRenderGroups(set: InstructionSet, buffer: WebGLRenderBuffer): void;
}

function transform(): TestTransform {
	return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0, offsetX: 0, offsetY: 0, alpha: 1, tint: 0xffffff };
}

function internals(renderer: WebGLRenderer): RendererInternals {
	return renderer as unknown as RendererInternals;
}

function mockBuffer(): WebGLRenderBuffer {
	return {
		globalMatrix: new Matrix(),
		globalAlpha: 1,
		globalTintColor: 0xffffff,
		offscreenOriginX: 0,
		offscreenOriginY: 0,
	} as WebGLRenderBuffer;
}

function registerGroup(
	renderer: WebGLRenderer,
	parentSet: InstructionSet,
	group: DisplayObjectContainer,
	groupSet: InstructionSet,
): TestTransform {
	const groupTransform = transform();
	groupSet.structureDirty = false;
	internals(renderer)._renderGroupSets.set(group, groupSet);
	parentSet.addLeaf({
		renderPipeId: 'renderGroup',
		renderable: group,
		set: groupSet,
		offsetX: 0,
		offsetY: 0,
		transform: groupTransform,
	} as never);
	return groupTransform;
}

describe('RenderGroup incremental updates', () => {
	it('updates both the parent group instruction and group descendants', () => {
		const renderer = new WebGLRenderer();
		const state = internals(renderer);
		const rootSet = state._instructionSet;
		rootSet.structureDirty = false;
		const group = new Sprite();
		group.isRenderGroup = true;
		const child = new Sprite();
		child.x = 5;
		group.addChild(child);
		const groupSet = new InstructionSet();
		const groupTransform = registerGroup(renderer, rootSet, group, groupSet);
		const childTransform = transform();
		groupSet.addLeaf({ renderPipeId: 'graphics', renderable: child, transform: childTransform } as never);

		group.x = 40;
		group.scaleX = 1.5;
		group.alpha = 0.5;
		renderer.markRenderableDirty(group);
		state._updateDirtyRenderables(rootSet);
		state._prepareRenderGroups(rootSet, undefined as never);

		expect(groupTransform.tx).toBeCloseTo(group.$getConcatenatedMatrix().tx);
		expect(childTransform.tx).toBeCloseTo(child.$getConcatenatedMatrix().tx);
		expect(childTransform.alpha).toBeCloseTo(0.5);
	});

	it('propagates an ancestor change through nested RenderGroups', () => {
		const renderer = new WebGLRenderer();
		const state = internals(renderer);
		const rootSet = state._instructionSet;
		rootSet.structureDirty = false;
		const root = new Sprite();
		const outer = new Sprite();
		const inner = new Sprite();
		const leaf = new Sprite();
		outer.isRenderGroup = true;
		inner.isRenderGroup = true;
		root.addChild(outer);
		outer.addChild(inner);
		inner.addChild(leaf);
		const outerSet = new InstructionSet();
		const innerSet = new InstructionSet();
		registerGroup(renderer, rootSet, outer, outerSet);
		registerGroup(renderer, outerSet, inner, innerSet);
		const leafTransform = transform();
		innerSet.addLeaf({ renderPipeId: 'graphics', renderable: leaf, transform: leafTransform } as never);

		root.x = 25;
		root.alpha = 0.4;
		renderer.markRenderableDirty(root);
		state._updateDirtyRenderables(rootSet);
		state._prepareRenderGroups(rootSet, undefined as never);

		expect(leafTransform.tx).toBeCloseTo(leaf.$getConcatenatedMatrix().tx);
		expect(leafTransform.alpha).toBeCloseTo(0.4);
	});

	it('processes a dirty leaf inside a stable group without rebuilding the root set', () => {
		const renderer = new WebGLRenderer();
		const state = internals(renderer);
		const rootSet = state._instructionSet;
		rootSet.structureDirty = false;
		const group = new Sprite();
		group.isRenderGroup = true;
		const child = new Sprite();
		group.addChild(child);
		const groupSet = new InstructionSet();
		registerGroup(renderer, rootSet, group, groupSet);
		const childTransform = transform();
		groupSet.addLeaf({ renderPipeId: 'graphics', renderable: child, transform: childTransform } as never);

		child.x = 18;
		renderer.markRenderableDirty(child);
		expect(rootSet.dirtyRenderableCount).toBe(0);
		expect(groupSet.dirtyRenderableCount).toBe(1);

		state._prepareRenderGroups(rootSet, undefined as never);

		expect(childTransform.tx).toBeCloseTo(child.$getConcatenatedMatrix().tx);
		expect(groupSet.dirtyRenderableCount).toBe(0);
		expect(rootSet.structureDirty).toBe(false);
	});

	it('updates every effect snapshot for an object inside a stable group', () => {
		const renderer = new WebGLRenderer();
		const state = internals(renderer);
		const rootSet = state._instructionSet;
		rootSet.structureDirty = false;
		const group = new Sprite();
		group.isRenderGroup = true;
		const child = new Sprite();
		group.addChild(child);
		const groupSet = new InstructionSet();
		registerGroup(renderer, rootSet, group, groupSet);
		const effectTransform = transform();
		const leafTransform = transform();
		groupSet.addIndexed({
			renderPipeId: 'filterPush',
			renderable: child,
			filters: [],
			offsetX: 0,
			offsetY: 0,
			savedBlendMode: 'source-over',
			transform: effectTransform,
		} as never);
		groupSet.addLeaf({ renderPipeId: 'graphics', renderable: child, transform: leafTransform } as never);

		child.x = 27;
		renderer.markRenderableDirty(child);
		state._prepareRenderGroups(rootSet, undefined as never);

		expect(effectTransform.tx).toBeCloseTo(child.$getConcatenatedMatrix().tx);
		expect(leafTransform.tx).toBeCloseTo(child.$getConcatenatedMatrix().tx);
	});

	it('rebuilds only a structurally dirty group set', () => {
		const renderer = new WebGLRenderer();
		const state = internals(renderer);
		const rootSet = state._instructionSet;
		rootSet.structureDirty = false;
		const group = new Sprite();
		group.isRenderGroup = true;
		const groupSet = new InstructionSet();
		registerGroup(renderer, rootSet, group, groupSet);
		group.addChild(new Bitmap());

		renderer.markStructureDirty(group);
		expect(groupSet.structureDirty).toBe(true);
		expect(rootSet.structureDirty).toBe(false);

		state._prepareRenderGroups(rootSet, mockBuffer());

		expect(groupSet.structureDirty).toBe(false);
		expect(groupSet.instructionSize).toBe(1);
		expect(rootSet.structureDirty).toBe(false);
	});
});
