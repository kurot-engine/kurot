import { SpriteSheet, Texture } from '@blakron/core';
import { MovieClipData } from './MovieClipData.js';
import {
	EgretMovieClipTextureParser,
	type MovieClipTextureParser,
} from './MovieClipTextureParser.js';
import type {
	EgretMovieClipData,
	EgretMovieClipDataSet,
	EgretMovieClipFrameData,
	EgretMovieClipResourceData,
} from './types.js';

function _validateFinite(value: number, name: string): number {
	if (!Number.isFinite(value)) {
		throw new RangeError(`${name} must be a finite number.`);
	}
	return value;
}

function _validateFrameNumber(value: number, frameCount: number, name: string): number {
	if (!Number.isInteger(value) || value < 1 || value > frameCount) {
		throw new RangeError(`${name} is out of range.`);
	}
	return value;
}

/**
 * Creates MovieClipData from the JSON format emitted by Egret's MovieClip
 * exporter and its matching atlas texture.
 *
 * SpriteSheet remains a core display primitive; this class only adapts Egret's
 * `mc`/`res` resource schema into runtime MovieClipData.
 */
export class MovieClipDataFactory {
	// ── Instance fields ───────────────────────────────────────────────────────

	/** Whether generated MovieClipData instances are cached by clip name. */
	public enableCache = true;

	private _mcDataSet: EgretMovieClipDataSet | undefined;
	private _texture: Texture | undefined;
	private _spriteSheet: SpriteSheet | undefined;
	private _textureParser: MovieClipTextureParser;
	private _cache = new Map<string, MovieClipData>();

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(
		mcDataSet?: EgretMovieClipDataSet,
		texture?: Texture,
		textureParser: MovieClipTextureParser = new EgretMovieClipTextureParser(),
	) {
		this._mcDataSet = mcDataSet;
		this._textureParser = textureParser;
		this._setTexture(texture);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/** Egret MovieClip JSON data set containing top-level `mc` and `res` maps. */
	public get mcDataSet(): EgretMovieClipDataSet | undefined {
		return this._mcDataSet;
	}

	public set mcDataSet(value: EgretMovieClipDataSet | undefined) {
		if (value === this._mcDataSet) return;
		this._mcDataSet = value;
		this.clearCache();
	}

	/** Atlas texture used to create a core SpriteSheet for generated frame textures. */
	public get texture(): Texture | undefined {
		return this._texture;
	}

	public set texture(value: Texture | undefined) {
		if (value === this._texture) return;
		this._setTexture(value);
		this.clearCache();
	}

	/** SpriteSheet created from texture, or undefined when no atlas texture is set. */
	public get spriteSheet(): SpriteSheet | undefined {
		return this._spriteSheet;
	}

	/** Strategy used to translate Egret frame offsets and atlas regions. */
	public get textureParser(): MovieClipTextureParser {
		return this._textureParser;
	}

	public set textureParser(value: MovieClipTextureParser) {
		if (value === this._textureParser) return;
		this._textureParser = value;
		this.clearCache();
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Clear all generated MovieClipData instances.
	 */
	public clearCache(): void {
		this._cache.clear();
	}

	/**
	 * Generate data for a named Egret MovieClip. With no name, generates the
	 * first clip in the data set. Returns undefined when no matching clip exists.
	 */
	public generateMovieClipData(movieClipName = ''): MovieClipData | undefined {
		const clips = this._mcDataSet?.mc;
		if (!clips) return undefined;

		const name = movieClipName || Object.keys(clips)[0];
		if (!name) return undefined;

		if (this.enableCache) {
			const cached = this._cache.get(name);
			if (cached) return cached;
		}

		const source = clips[name];
		if (!source) return undefined;

		const data = this._createMovieClipData(name, source);
		if (this.enableCache) {
			this._cache.set(name, data);
		}
		return data;
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _setTexture(value: Texture | undefined): void {
		this._texture = value;
		this._spriteSheet = value ? new SpriteSheet(value) : undefined;
	}

	private _createMovieClipData(name: string, source: EgretMovieClipData): MovieClipData {
		const frameRate = source.frameRate ?? 24;
		const data = new MovieClipData();
		data.frameRate = frameRate;

		const frameDuration = 1000 / frameRate;
		const frames = source.frames ?? [];
		for (let index = 0; index < frames.length; index++) {
			const frame = frames[index];
			const texture = this._createFrameTexture(name, index, frame);
			const repeat = this._getFrameRepeat(frame, index);
			for (let repeatIndex = 0; repeatIndex < repeat; repeatIndex++) {
				data.addFrame(texture, frameDuration);
			}
		}

		for (const label of source.labels ?? []) {
			const startFrame = _validateFrameNumber(label.frame, data.frameCount, 'MovieClip label frame') - 1;
			const endFrame = _validateFrameNumber(label.end ?? label.frame, data.frameCount, 'MovieClip label end frame') - 1;
			data.setFrameLabel(label.name, startFrame, endFrame);
		}

		for (const event of source.events ?? []) {
			const frameIndex = _validateFrameNumber(event.frame, data.frameCount, 'MovieClip event frame') - 1;
			data.setFrameEvent(frameIndex, event.name);
		}

		return data;
	}

	private _createFrameTexture(
		movieClipName: string,
		frameIndex: number,
		frame: EgretMovieClipFrameData,
	): Texture | undefined {
		if (!frame.res || !this._spriteSheet) return undefined;

		const resource = this._mcDataSet?.res?.[frame.res];
		if (!resource) {
			return this._spriteSheet.getTexture(frame.res);
		}

		const x = _validateFinite(frame.x ?? 0, 'MovieClip frame x offset');
		const y = _validateFinite(frame.y ?? 0, 'MovieClip frame y offset');
		const { x: bitmapX, y: bitmapY, w: bitmapWidth, h: bitmapHeight } = this._validateResource(resource, frame.res);
		return this._textureParser.createFrameTexture(this._spriteSheet, {
			name: `${movieClipName}:${frameIndex}:${frame.res}`,
			bitmapX,
			bitmapY,
			bitmapWidth,
			bitmapHeight,
			offsetX: x,
			offsetY: y,
		});
	}

	private _getFrameRepeat(frame: EgretMovieClipFrameData, frameIndex: number): number {
		const duration = frame.duration ?? 1;
		if (!Number.isInteger(duration) || duration < 1) {
			throw new RangeError(`MovieClip frame duration at index ${frameIndex} must be a positive integer.`);
		}
		return duration;
	}

	private _validateResource(resource: EgretMovieClipResourceData, name: string): EgretMovieClipResourceData {
		const x = _validateFinite(resource.x, `MovieClip resource ${name} x`);
		const y = _validateFinite(resource.y, `MovieClip resource ${name} y`);
		const w = _validateFinite(resource.w, `MovieClip resource ${name} width`);
		const h = _validateFinite(resource.h, `MovieClip resource ${name} height`);
		if (w <= 0 || h <= 0) {
			throw new RangeError(`MovieClip resource ${name} dimensions must be positive.`);
		}
		return { x, y, w, h };
	}
}
