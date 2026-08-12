import { describe, it, expect } from 'vitest';
import { InstructionSet, type Instruction } from '../src/blakron/player/webgl/InstructionSet.js';
import type { DisplayObject } from '../src/blakron/display/DisplayObject.js';

function mockObj(id = 1): DisplayObject {
	return { hashCode: id } as unknown as DisplayObject;
}

function mockInstruction(pipeId: string, obj: DisplayObject): Instruction {
	return { renderPipeId: pipeId, renderable: obj };
}

describe('InstructionSet', () => {
	it('initial state', () => {
		const set = new InstructionSet();
		expect(set.structureDirty).toBe(true);
		expect(set.instructionSize).toBe(0);
		expect(set.dirtyRenderableCount).toBe(0);
	});

	it('add increments instructionSize', () => {
		const set = new InstructionSet();
		const obj = mockObj();
		set.add(mockInstruction('bitmap', obj));
		expect(set.instructionSize).toBe(1);
		expect(set.instructions[0].renderPipeId).toBe('bitmap');
	});

	it('addLeaf registers in renderableIndex', () => {
		const set = new InstructionSet();
		const obj = mockObj();
		const inst = mockInstruction('bitmap', obj);
		set.addLeaf(inst);
		expect(set.instructionSize).toBe(1);
		expect(set.renderableIndex.get(obj)).toBe(0);
	});

	it('addLeaf multiple objects have correct indices', () => {
		const set = new InstructionSet();
		const a = mockObj(1);
		const b = mockObj(2);
		set.addLeaf(mockInstruction('bitmap', a));
		set.add(mockInstruction('filterPush', a)); // non-leaf
		set.addLeaf(mockInstruction('mesh', b));
		expect(set.renderableIndex.get(a)).toBe(0);
		expect(set.renderableIndex.get(b)).toBe(2);
	});

	it('indexes every transform-bearing instruction for the same renderable', () => {
		const set = new InstructionSet();
		const obj = mockObj();
		set.addIndexed(mockInstruction('filterPush', obj));
		set.addLeaf(mockInstruction('bitmap', obj));
		set.add(mockInstruction('filterPop', obj));

		expect(set.renderableIndex.get(obj)).toEqual([0, 1]);
	});

	it('reset releases instruction and dirty-renderable references', () => {
		const set = new InstructionSet();
		const dirty = mockObj(3);
		set.add(mockInstruction('a', mockObj()));
		set.add(mockInstruction('b', mockObj(2)));
		set.markRenderableDirty(dirty);
		set.reset();
		expect(set.instructionSize).toBe(0);
		expect(set.dirtyRenderableCount).toBe(0);
		expect(set.renderableIndex.size).toBe(0);
		expect(set.instructions).toHaveLength(0);
		expect(set.dirtyRenderables).toHaveLength(0);
	});

	it('markRenderableDirty tracks dirty objects', () => {
		const set = new InstructionSet();
		const obj = mockObj();
		set.markRenderableDirty(obj);
		expect(set.dirtyRenderableCount).toBe(1);
		expect(set.dirtyRenderables[0]).toBe(obj);
	});

	it('deduplicates a renderable dirtied repeatedly in the same frame', () => {
		const set = new InstructionSet();
		const obj = mockObj();
		set.markRenderableDirty(obj);
		set.markRenderableDirty(obj);
		set.markRenderableDirty(obj);
		expect(set.dirtyRenderableCount).toBe(1);
		expect(set.dirtyRenderables).toEqual([obj]);

		set.clearDirtyRenderables();
		set.markRenderableDirty(obj);
		expect(set.dirtyRenderableCount).toBe(1);
	});

	it('reuse slots after reset', () => {
		const set = new InstructionSet();
		const obj1 = mockObj(1);
		set.add(mockInstruction('bitmap', obj1));
		set.reset();
		const obj2 = mockObj(2);
		set.add(mockInstruction('mesh', obj2));
		expect(set.instructionSize).toBe(1);
		expect(set.instructions[0].renderable).toBe(obj2);
	});
});
