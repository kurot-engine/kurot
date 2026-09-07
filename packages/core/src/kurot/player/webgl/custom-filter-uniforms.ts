import type { CustomFilter } from '../../filters/CustomFilter.js';
import type { WebGLProgram } from './WebGLProgram.js';
import type { GL } from './WebGLUtils.js';
import type { FilterSampler } from './WebGLFilterSystem.js';

const RESERVED = new Set(['projectionVector', 'uSampler', 'uTextureSize', 'uInputSize', 'uInputClamp', 'uResolution', 'uOutputSize']);

export function uploadCustomUniforms(gl: GL, program: WebGLProgram, filter: CustomFilter,
	width: number, height: number, resolution: number, outputWidth: number, outputHeight: number,
	inputs: Record<string, FilterSampler>): void {
	const locations = program.uniforms;
	const automaticTypes: Record<string, number> = {
		projectionVector: gl.FLOAT_VEC2, uSampler: gl.SAMPLER_2D, uTextureSize: gl.FLOAT_VEC2,
		uInputSize: gl.FLOAT_VEC4, uInputClamp: gl.FLOAT_VEC4, uResolution: gl.FLOAT, uOutputSize: gl.FLOAT_VEC4,
	};
	for (const [name, type] of Object.entries(automaticTypes)) {
		const info = program.uniformInfo[name];
		if (info && (info.type !== type || info.size !== 1)) {
			throw new Error(`CustomFilter ${name} has an invalid automatic uniform type.`);
		}
	}
	if (locations.uTextureSize) { gl.uniform2f(locations.uTextureSize, width, height); }
	if (locations.uInputSize) { gl.uniform4f(locations.uInputSize, width, height, 1 / width, 1 / height); }
	if (locations.uInputClamp) {
		gl.uniform4f(locations.uInputClamp, 0.5 / width, 0.5 / height, 1 - 0.5 / width, 1 - 0.5 / height);
	}
	if (locations.uResolution) { gl.uniform1f(locations.uResolution, resolution); }
	if (locations.uOutputSize) { gl.uniform4f(locations.uOutputSize, outputWidth, outputHeight, 1 / outputWidth, 1 / outputHeight); }
	for (const name of Object.keys(filter.uniforms)) {
		if (RESERVED.has(name)) throw new Error(`CustomFilter uniform ${name} is reserved.`);
	}
	const resources = { ...filter.textures, ...inputs };
	for (const [name, info] of Object.entries(program.uniformInfo)) {
		if (RESERVED.has(name)) continue;
		if (resources[name] || (name.endsWith('Matrix') && resources[name.slice(0, -6)])
			|| (name.endsWith('Clamp') && resources[name.slice(0, -5)])) continue;
		const baseName = name.replace(/\[0\]$/, '');
		const value = filter.uniforms[baseName];
		if (value === undefined) throw new Error(`CustomFilter uniform ${baseName} is missing.`);
		uploadUniform(gl, locations[name]!, info.type, info.size, value, baseName);
	}
}

function uploadUniform(gl: GL, location: WebGLUniformLocation, type: number, size: number, value: unknown, name: string): void {
	const integerTypes: number[] = [gl.INT, gl.BOOL, gl.INT_VEC2, gl.INT_VEC3, gl.INT_VEC4, gl.BOOL_VEC2, gl.BOOL_VEC3, gl.BOOL_VEC4];
	const integer = integerTypes.includes(type);
	const components: Record<number, number> = {
		[gl.FLOAT]: 1, [gl.INT]: 1, [gl.BOOL]: 1,
		[gl.FLOAT_VEC2]: 2, [gl.FLOAT_VEC3]: 3, [gl.FLOAT_VEC4]: 4,
		[gl.INT_VEC2]: 2, [gl.INT_VEC3]: 3, [gl.INT_VEC4]: 4,
		[gl.BOOL_VEC2]: 2, [gl.BOOL_VEC3]: 3, [gl.BOOL_VEC4]: 4,
		[gl.FLOAT_MAT2]: 4, [gl.FLOAT_MAT3]: 9, [gl.FLOAT_MAT4]: 16,
	};
	const count = components[type];
	if (!count) throw new Error(`CustomFilter uniform ${name} has unsupported GLSL type ${type}.`);
	let values: number[];
	if (typeof value === 'number' || typeof value === 'boolean') {
		values = [Number(value)];
	} else if (Array.isArray(value) || value instanceof Float32Array || value instanceof Int32Array) {
		values = Array.from(value);
	} else {
		throw new TypeError(`CustomFilter uniform ${name} requires a numeric value or array.`);
	}
	if (values.length !== count * size || values.some(v => typeof v !== 'number' || !Number.isFinite(v)
		|| (integer && (!Number.isInteger(v) || v < -2147483648 || v > 2147483647)))) {
		throw new TypeError(`CustomFilter uniform ${name} requires ${count * size} finite ${integer ? 'integer' : 'numeric'} values.`);
	}
	if (integer) {
		const data = new Int32Array(values);
		switch (count) {
			case 1: gl.uniform1iv(location, data); return;
			case 2: gl.uniform2iv(location, data); return;
			case 3: gl.uniform3iv(location, data); return;
			case 4: gl.uniform4iv(location, data); return;
		}
	}
	const data = new Float32Array(values);
	switch (type) {
		case gl.FLOAT: gl.uniform1fv(location, data); return;
		case gl.FLOAT_VEC2: gl.uniform2fv(location, data); return;
		case gl.FLOAT_VEC3: gl.uniform3fv(location, data); return;
		case gl.FLOAT_VEC4: gl.uniform4fv(location, data); return;
		case gl.FLOAT_MAT2: gl.uniformMatrix2fv(location, false, data); return;
		case gl.FLOAT_MAT3: gl.uniformMatrix3fv(location, false, data); return;
		case gl.FLOAT_MAT4: gl.uniformMatrix4fv(location, false, data); return;
	}
}
