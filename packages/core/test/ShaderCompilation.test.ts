import { describe, expect, it, vi } from 'vitest';
import { createProgram } from '../src/kurot/player/webgl/WebGLUtils.js';
import type { GL } from '../src/kurot/player/webgl/WebGLUtils.js';
import { BlurFilter } from '../src/kurot/filters/BlurFilter.js';

function makeGL(fragmentSucceeds: boolean, linkSucceeds: boolean): GL {
	let shaders = 0;
	return {
		VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
		createShader: vi.fn(() => ({ index: ++shaders })),
		shaderSource: vi.fn(), compileShader: vi.fn(),
		getShaderParameter: vi.fn((shader: { index: number }) => shader.index === 1 || fragmentSucceeds),
		getShaderInfoLog: vi.fn(() => 'bad token'), deleteShader: vi.fn(),
		createProgram: vi.fn(() => ({})), attachShader: vi.fn(), linkProgram: vi.fn(),
		getProgramParameter: vi.fn(() => linkSucceeds), getProgramInfoLog: vi.fn(() => 'varying mismatch'),
		deleteProgram: vi.fn(),
	} as unknown as GL;
}

describe('shader failure cleanup', () => {
	it('cleans both shaders when fragment compilation fails', () => {
		const gl = makeGL(false, false);
		expect(() => createProgram(gl, 'vertex', 'line one\nline two', 'test')).toThrow('2: line two');
		expect(gl.deleteShader).toHaveBeenCalledTimes(2);
		expect(gl.createProgram).not.toHaveBeenCalled();
	});

	it('cleans the program and shaders when linking fails', () => {
		const gl = makeGL(true, false);
		expect(() => createProgram(gl, 'vertex', 'fragment', 'test')).toThrow('Program link failed (test)');
		expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
		expect(gl.deleteShader).toHaveBeenCalledTimes(2);
	});

	it('deletes shader handles after successful linking without deleting the program', () => {
		const gl = makeGL(true, true);
		expect(createProgram(gl, 'vertex', 'fragment')).toBeDefined();
		expect(gl.deleteShader).toHaveBeenCalledTimes(2);
		expect(gl.deleteProgram).not.toHaveBeenCalled();
	});
});

describe('blur parameter contract', () => {
	it('rejects invalid quality and radii', () => {
		for (const quality of [0, 1.5, 17, Infinity]) {
			expect(() => new BlurFilter(4, 4, quality)).toThrow(RangeError);
		}
		const filter = new BlurFilter();
		expect(() => { filter.blurX = -1; }).toThrow(RangeError);
		expect(() => { filter.blurY = NaN; }).toThrow(RangeError);
	});

	it('reserves the support of repeated passes', () => {
		const filter = new BlurFilter(8, 4, 4);
		expect(filter.getPadding()).toEqual({ left: 16, right: 16, top: 8, bottom: 8 });
	});
});
