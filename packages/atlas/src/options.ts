import { AtlasError } from './AtlasError.js';
import type { AtlasOptions, AtlasSource } from './AtlasTypes.js';

export type PackingOptions = Required<AtlasOptions>;

export function resolveOptions(options: AtlasOptions): PackingOptions {
	const resolved = {
		file: options.file ?? 'atlas.png',
		maxWidth: options.maxWidth ?? 2048,
		maxHeight: options.maxHeight ?? 2048,
		trim: options.trim ?? true,
		alphaThreshold: options.alphaThreshold ?? 1,
		trimMargin: options.trimMargin ?? 1,
		extrude: options.extrude ?? 1,
		shapePadding: options.shapePadding ?? 0,
		borderPadding: options.borderPadding ?? 0,
		maxPixels: options.maxPixels ?? 16_777_216,
	};
	if (typeof resolved.file !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]*\.png$/.test(resolved.file)) {
		throw new AtlasError('invalid-options', 'file must be a PNG basename without directories.');
	}
	if (typeof resolved.trim !== 'boolean') {
		throw new AtlasError('invalid-options', 'trim must be boolean.');
	}
	for (const key of ['maxWidth', 'maxHeight'] as const) {
		checkInteger(key, resolved[key], 1, 16_384);
	}
	checkInteger('alphaThreshold', resolved.alphaThreshold, 1, 255);
	for (const key of ['trimMargin', 'extrude', 'shapePadding', 'borderPadding'] as const) {
		checkInteger(key, resolved[key], 0, 1024);
	}
	checkInteger('maxPixels', resolved.maxPixels, 1, 67_108_864);
	return resolved;
}

export function validateSources(sources: readonly AtlasSource[], options: PackingOptions): void {
	if (!Array.isArray(sources) || sources.length === 0 || sources.length > 4096) {
		throw new AtlasError('invalid-input', 'Provide between 1 and 4096 source images.');
	}
	const names = new Set<string>();
	let pixels = 0;
	for (const source of sources) {
		if (typeof source.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(source.name)) {
			throw new AtlasError('invalid-input', 'Source names must be nonempty resource keys without paths or whitespace.');
		}
		if (names.has(source.name)) {
			throw new AtlasError('invalid-input', `Duplicate source name: ${source.name}.`);
		}
		names.add(source.name);
		if (!Number.isSafeInteger(source.width) || source.width < 1 ||
			!Number.isSafeInteger(source.height) || source.height < 1) {
			throw new AtlasError('invalid-input', `Invalid source dimensions: ${source.name}.`);
		}
		pixels += source.width * source.height;
		if (!Number.isSafeInteger(pixels) || pixels > options.maxPixels) {
			throw new AtlasError('invalid-input', 'Total source pixels exceed maxPixels.');
		}
		if (!(source.pixels instanceof Uint8Array || source.pixels instanceof Uint8ClampedArray) ||
			source.pixels.length !== source.width * source.height * 4) {
			throw new AtlasError('invalid-input', `Expected width × height × 4 RGBA bytes: ${source.name}.`);
		}
	}
}

function checkInteger(key: string, value: number, min: number, max: number): void {
	if (!Number.isSafeInteger(value) || value < min || value > max) {
		throw new AtlasError('invalid-options', `${key} must be an integer in ${min}–${max}.`);
	}
}
