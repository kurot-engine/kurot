import { Buffer } from 'node:buffer';
import { PNG } from 'pngjs';
import { AtlasError } from '../AtlasError.js';
import type { AtlasData, AtlasImage, AtlasOptions } from '../AtlasTypes.js';
import { packAtlas } from '../pack-atlas.js';
import { resolveOptions } from '../options.js';

export interface PNGAtlasSource {
	readonly name: string;
	readonly png: Uint8Array;
}

export interface PNGAtlasResult {
	png: Uint8Array;
	data: AtlasData;
	width: number;
	height: number;
}

/**
 * Node.js PNG adapter. Decodes all sources, packs once and encodes RGBA8 PNG.
 * Performs no filesystem writes. Run large jobs in a caller-owned worker.
 */
export function packPNGAtlas(sources: readonly PNGAtlasSource[], options: AtlasOptions = {}): PNGAtlasResult {
	const settings = resolveOptions(options);
	if (!Array.isArray(sources) || sources.length === 0 || sources.length > 4096) {
		throw new AtlasError('invalid-input', 'Provide between 1 and 4096 PNG sources.');
	}
	let pixelCount = 0;
	// Read every header before decoding so an oversized batch cannot allocate all decoded images first.
	for (const source of sources) {
		pixelCount += readPixelCount(source.png);
		if (!Number.isSafeInteger(pixelCount) || pixelCount > settings.maxPixels) {
			throw new AtlasError('invalid-input', 'Total source pixels exceed maxPixels.');
		}
	}
	const decoded = sources.map(source => ({ name: source.name, ...decodePNG(source.png, settings.maxPixels) }));
	const result = packAtlas(decoded, settings);
	return { png: encodePNG(result.image), data: result.data, width: result.image.width, height: result.image.height };
}

/**
 * Decodes static PNG to straight-alpha RGBA8 without gamma correction.
 * maxPixels defaults to 16,777,216; input is limited to 32 MiB. APNG is rejected.
 */
export function decodePNG(bytes: Uint8Array, maxPixels = 16_777_216): AtlasImage {
	if (!Number.isSafeInteger(maxPixels) || maxPixels < 1 || maxPixels > 67_108_864) {
		throw new AtlasError('invalid-options', 'Invalid maxPixels limit.');
	}
	if (readPixelCount(bytes) > maxPixels) {
		throw new AtlasError('invalid-input', 'PNG pixels exceed maxPixels.');
	}
	try {
		const png = PNG.sync.read(Buffer.from(bytes), { checkCRC: true });
		return { width: png.width, height: png.height, pixels: new Uint8Array(png.data) };
	} catch (cause) {
		throw new AtlasError('invalid-png', 'Unable to decode PNG.', { cause });
	}
}

/**
 * Encodes straight-alpha RGBA as a static 8-bit PNG; leaves the image buffer unchanged.
 */
export function encodePNG(image: AtlasImage): Uint8Array {
	if (!Number.isSafeInteger(image.width) || image.width < 1 || !Number.isSafeInteger(image.height) || image.height < 1 ||
		image.width * image.height > 67_108_864 ||
		!(image.pixels instanceof Uint8Array || image.pixels instanceof Uint8ClampedArray) ||
		image.pixels.length !== image.width * image.height * 4) {
		throw new AtlasError('invalid-input', 'Invalid RGBA image dimensions or pixels.');
	}
	const png = new PNG({ width: image.width, height: image.height });
	png.data.set(image.pixels);
	return new Uint8Array(PNG.sync.write(png,
		{ colorType: 6, inputColorType: 6, bitDepth: 8, deflateLevel: 9, deflateStrategy: 3, filterType: -1 }));
}

function readPixelCount(bytes: Uint8Array): number {
	if (!(bytes instanceof Uint8Array) || bytes.length < 33 || bytes.length > 33_554_432) {
		throw new AtlasError('invalid-png', 'PNG input must contain 33 bytes to 32 MiB.');
	}
	const signature = [137, 80, 78, 71, 13, 10, 26, 10];
	if (!signature.every((byte, index) => bytes[index] === byte)) {
		throw new AtlasError('invalid-png', 'Invalid PNG signature.');
	}
	const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (buffer.readUInt32BE(8) !== 13 || buffer.toString('ascii', 12, 16) !== 'IHDR') {
		throw new AtlasError('invalid-png', 'PNG must start with an IHDR chunk.');
	}
	const width = buffer.readUInt32BE(16);
	const height = buffer.readUInt32BE(20);
	if (width === 0 || height === 0 || !Number.isSafeInteger(width * height)) {
		throw new AtlasError('invalid-png', 'Invalid PNG dimensions.');
	}
	for (let offset = 8; offset + 12 <= buffer.length;) {
		const length = buffer.readUInt32BE(offset);
		if (length > buffer.length - offset - 12) {
			throw new AtlasError('invalid-png', 'Truncated PNG chunk.');
		}
		if (buffer.toString('ascii', offset + 4, offset + 8) === 'acTL') {
			throw new AtlasError('invalid-png', 'Animated PNG is not supported.');
		}
		offset += length + 12;
	}
	return width * height;
}
