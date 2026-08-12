import { describe, expect, it } from 'vitest';
import { Sprite } from '../src/blakron/display/Sprite.js';
import { InstructionSet } from '../src/blakron/player/webgl/InstructionSet.js';
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

function makeTransform(): TestTransform {
	return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0, offsetX: 0, offsetY: 0, alpha: 1, tint: 0xffffff };
}

function updateDirty(renderer: WebGLRenderer, set: InstructionSet): void {
	(renderer as unknown as { _updateDirtyRenderables(value: InstructionSet): void })._updateDirtyRenderables(set);
}

describe('WebGLRenderer dirty container updates', () => {
	it('refreshes descendant transforms when a parent container moves and scales', () => {
		const renderer = new WebGLRenderer();
		const set = new InstructionSet();
		const parent = new Sprite();
		const child = new Sprite();
		child.x = 7;
		child.y = 9;
		parent.addChild(child);
		const transform = makeTransform();
		set.addLeaf({ renderPipeId: 'graphics', renderable: child, transform } as never);

		parent.x = 20;
		parent.y = 30;
		parent.scaleX = 2;
		set.markRenderableDirty(parent);
		updateDirty(renderer, set);

		const world = child.$getConcatenatedMatrix();
		expect(transform.a).toBeCloseTo(world.a);
		expect(transform.d).toBeCloseTo(world.d);
		expect(transform.tx).toBeCloseTo(world.tx);
		expect(transform.ty).toBeCloseTo(world.ty);
		expect(set.dirtyRenderableCount).toBe(0);
		expect(set.dirtyRenderables).toHaveLength(0);
	});

	it('refreshes children when a Sprite has both its own leaf and descendants', () => {
		const renderer = new WebGLRenderer();
		const set = new InstructionSet();
		const parent = new Sprite();
		const child = new Sprite();
		child.x = 6;
		parent.addChild(child);
		const parentTransform = makeTransform();
		const childTransform = makeTransform();
		set.addLeaf({ renderPipeId: 'graphics', renderable: parent, transform: parentTransform } as never);
		set.addLeaf({ renderPipeId: 'graphics', renderable: child, transform: childTransform } as never);

		parent.x = 13;
		parent.scaleY = 1.25;
		set.markRenderableDirty(parent);
		updateDirty(renderer, set);

		expect(parentTransform.tx).toBeCloseTo(parent.$getConcatenatedMatrix().tx);
		expect(childTransform.tx).toBeCloseTo(child.$getConcatenatedMatrix().tx);
		expect(childTransform.d).toBeCloseTo(child.$getConcatenatedMatrix().d);
	});

	it('propagates parent alpha and the nearest non-default tint to descendants', () => {
		const renderer = new WebGLRenderer();
		const set = new InstructionSet();
		const parent = new Sprite();
		const child = new Sprite();
		const grandchild = new Sprite();
		parent.addChild(child);
		child.addChild(grandchild);
		const childTransform = makeTransform();
		const grandchildTransform = makeTransform();
		set.addLeaf({ renderPipeId: 'graphics', renderable: child, transform: childTransform } as never);
		set.addLeaf({ renderPipeId: 'graphics', renderable: grandchild, transform: grandchildTransform } as never);

		parent.alpha = 0.5;
		child.alpha = 0.4;
		grandchild.alpha = 0.25;
		parent.tint = 0xff0000;
		child.tint = 0x00ff00;
		set.markRenderableDirty(parent);
		updateDirty(renderer, set);

		expect(childTransform.alpha).toBeCloseTo(0.2);
		expect(grandchildTransform.alpha).toBeCloseTo(0.05);
		expect(childTransform.tint).toBe(child.$tintRGB);
		expect(grandchildTransform.tint).toBe(child.$tintRGB);
	});
});
