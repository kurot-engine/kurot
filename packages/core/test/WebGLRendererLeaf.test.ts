import { describe, expect, it, vi } from 'vitest';
import { Bitmap } from '../src/blakron/display/Bitmap.js';
import { DisplayObject, RenderObjectType } from '../src/blakron/display/DisplayObject.js';
import { Mesh } from '../src/blakron/display/Mesh.js';
import { Shape } from '../src/blakron/display/Shape.js';
import { Sprite } from '../src/blakron/display/Sprite.js';
import { Filter } from '../src/blakron/filters/Filter.js';
import { Matrix } from '../src/blakron/geom/Matrix.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';
import { TextField } from '../src/blakron/text/TextField.js';
import { InstructionSet } from '../src/blakron/player/webgl/InstructionSet.js';
import type { WebGLRenderBuffer } from '../src/blakron/player/webgl/WebGLRenderBuffer.js';
import { WebGLRenderer } from '../src/blakron/player/webgl/WebGLRenderer.js';

interface LeafInstruction {
	renderPipeId: string;
	renderable: DisplayObject;
	offsetX: number;
	offsetY: number;
}

interface RendererHarness {
	_createLeafInstruction(obj: DisplayObject, offsetX: number, offsetY: number): LeafInstruction | undefined;
	_executeLeafInstruction(instruction: LeafInstruction, buffer: WebGLRenderBuffer): void;
	_buildLeaf(
		obj: DisplayObject,
		set: InstructionSet,
		buffer: WebGLRenderBuffer,
		offsetX: number,
		offsetY: number,
	): void;
	_buildInstructions(
		obj: DisplayObject,
		set: InstructionSet,
		buffer: WebGLRenderBuffer,
		offsetX: number,
		offsetY: number,
		options?: { isStage?: boolean; inlineRenderGroups?: boolean },
	): void;
	_renderMaskObject(obj: DisplayObject, buffer: WebGLRenderBuffer, offsetX: number, offsetY: number): void;
	_executeInstructions(set: InstructionSet, buffer: WebGLRenderBuffer): void;
	readonly _maskInstructionSets: InstructionSet[];
}

function renderer(): RendererHarness {
	return new WebGLRenderer() as unknown as RendererHarness;
}

function buffer(): WebGLRenderBuffer {
	return {
		globalMatrix: new Matrix(),
		globalAlpha: 1,
		globalTintColor: 0xffffff,
	} as WebGLRenderBuffer;
}

describe('WebGLRenderer shared leaf dispatch', () => {
	it('maps every renderable type through one leaf-instruction factory', () => {
		const target = renderer();
		const shape = new Shape();
		const sprite = new Sprite();
		const particle = new DisplayObject();
		particle.$renderObjectType = RenderObjectType.PARTICLE;
		shape.graphics.beginFill(0xffffff);
		shape.graphics.drawRect(0, 0, 10, 10);
		sprite.graphics.beginFill(0xffffff);
		sprite.graphics.drawRect(0, 0, 10, 10);

		expect(target._createLeafInstruction(new Bitmap(), 3, 4)?.renderPipeId).toBe('bitmap');
		expect(target._createLeafInstruction(new Mesh(), 3, 4)?.renderPipeId).toBe('mesh');
		expect(target._createLeafInstruction(shape, 3, 4)?.renderPipeId).toBe('graphics');
		expect(target._createLeafInstruction(sprite, 3, 4)?.renderPipeId).toBe('graphics');
		expect(target._createLeafInstruction(new TextField(), 3, 4)?.renderPipeId).toBe('text');
		expect(target._createLeafInstruction(particle, 3, 4)?.renderPipeId).toBe('particle');
		expect(target._createLeafInstruction(new Sprite(), 3, 4)).toBeUndefined();
		expect(target._createLeafInstruction(new DisplayObject(), 3, 4)).toBeUndefined();
	});

	it('builds mask objects through the shared leaf-instruction factory', () => {
		const target = renderer();
		const shape = new Shape();
		shape.graphics.beginFill(0xffffff);
		shape.graphics.drawRect(0, 0, 10, 10);
		const create = vi.spyOn(target, '_createLeafInstruction');
		let renderPipeIds: string[] = [];
		vi.spyOn(target, '_executeInstructions').mockImplementation((set) => {
			renderPipeIds = set.instructions.slice(0, set.instructionSize).map((instruction) => instruction.renderPipeId);
		});

		target._renderMaskObject(shape, buffer(), 5, 7);

		expect(create).toHaveBeenCalledWith(shape, 5, 7);
		expect(renderPipeIds).toEqual(['graphics']);
		expect(target._maskInstructionSets[0].instructionSize).toBe(0);
	});

	it('preserves nested effects and caches while inlining RenderGroups in mask scratch sets', () => {
		const target = renderer();
		const root = new Sprite();
		const filtered = new Shape();
		const scrolled = new Shape();
		const grouped = new Sprite();
		const blended = new Shape();
		const cached = new Sprite();
		filtered.graphics.beginFill(0xffffff);
		filtered.graphics.drawRect(0, 0, 10, 10);
		filtered.filters = [new Filter()];
		scrolled.graphics.beginFill(0xffffff);
		scrolled.graphics.drawRect(0, 0, 10, 10);
		scrolled.scrollRect = new Rectangle(0, 0, 8, 8);
		grouped.graphics.beginFill(0xffffff);
		grouped.graphics.drawRect(0, 0, 10, 10);
		grouped.isRenderGroup = true;
		blended.graphics.beginFill(0xffffff);
		blended.graphics.drawRect(0, 0, 10, 10);
		blended.blendMode = 'lighter';
		cached.graphics.beginFill(0xffffff);
		cached.graphics.drawRect(0, 0, 10, 10);
		cached.$displayList = {} as never;
		root.addChild(filtered);
		root.addChild(scrolled);
		root.addChild(grouped);
		root.addChild(blended);
		root.addChild(cached);
		let renderPipeIds: string[] = [];
		vi.spyOn(target, '_executeInstructions').mockImplementation((set) => {
			renderPipeIds = set.instructions.slice(0, set.instructionSize).map((instruction) => instruction.renderPipeId);
		});

		target._renderMaskObject(root, buffer(), 0, 0);

		expect(renderPipeIds).toEqual([
			'filterPush',
			'graphics',
			'filterPop',
			'maskPush',
			'graphics',
			'maskPop',
			'graphics',
			'maskPush',
			'graphics',
			'maskPop',
			'displayListCache',
		]);
		expect(renderPipeIds).not.toContain('renderGroup');
	});

	it('uses a separate scratch instruction set for a nested mask render', () => {
		const target = renderer();
		const outer = new Shape();
		const inner = new Shape();
		outer.graphics.beginFill(0xffffff);
		outer.graphics.drawRect(0, 0, 10, 10);
		inner.graphics.beginFill(0xffffff);
		inner.graphics.drawRect(0, 0, 5, 5);
		const sizes: number[] = [];
		let nested = false;
		vi.spyOn(target, '_executeInstructions').mockImplementation((set, targetBuffer) => {
			sizes.push(set.instructionSize);
			if (!nested) {
				nested = true;
				target._renderMaskObject(inner, targetBuffer, 0, 0);
			}
		});

		target._renderMaskObject(outer, buffer(), 0, 0);

		expect(sizes).toEqual([1, 1]);
		expect(target._maskInstructionSets).toHaveLength(2);
		expect(target._maskInstructionSets.every((set) => set.instructionSize === 0)).toBe(true);
	});

	it('uses the shared factory when building the main instruction set', () => {
		const target = renderer();
		const shape = new Shape();
		const set = new InstructionSet();
		shape.graphics.beginFill(0xffffff);
		shape.graphics.drawRect(0, 0, 10, 10);
		const create = vi.spyOn(target, '_createLeafInstruction');

		target._buildLeaf(shape, set, buffer(), 5, 7);

		expect(create).toHaveBeenCalledWith(shape, 5, 7);
		expect(set.instructions[0]).toEqual(
			expect.objectContaining({ renderPipeId: 'graphics', renderable: shape, offsetX: 5, offsetY: 7 }),
		);
	});

	it('ignores only the stage cache while preserving descendant caches', () => {
		const target = renderer();
		const stage = new Sprite();
		const cachedChild = new Sprite();
		stage.$displayList = {} as never;
		cachedChild.$displayList = {} as never;
		stage.addChild(cachedChild);
		const set = new InstructionSet();

		target._buildInstructions(stage, set, buffer(), 0, 0, { isStage: true });

		expect(set.instructions.slice(0, set.instructionSize).map((instruction) => instruction.renderPipeId)).toEqual([
			'displayListCache',
		]);
		expect(set.instructions[0]?.renderable).toBe(cachedChild);
	});
});
