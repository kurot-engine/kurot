import { Component } from './Component.js';
import { Texture, Event, Bitmap, BitmapFillMode, Rectangle } from '@blakron/core';
import { getAssetAdapter } from '../core/AssetAdapterRegistry.js';

/**
 * Image component that displays bitmap data.
 *
 * Supports setting `source` to a URL string (loaded via the asset adapter)
 * or a Texture instance directly.
 *
 * States: none (non-interactive visual element).
 */
export class Image extends Component {
	// ── Instance fields ───────────────────────────────────────────────────

	private _source?: string | Texture;
	private _sourceChanged = false;
	private _bitmap?: Bitmap;
	private _scale9Grid?: Rectangle;
	private _fillMode: BitmapFillMode = BitmapFillMode.SCALE;
	private _smoothing = true;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(source?: string | Texture) {
		super();
		if (source) this.source = source;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get source(): string | Texture | undefined {
		return this._source;
	}

	public set source(value: string | Texture | undefined) {
		if (this._source === value) return;
		this._source = value;
		if (value && typeof value === 'string') {
			this._sourceChanged = true;
			this.invalidateProperties();
		} else {
			this._applyTexture((value as Texture) ?? undefined);
		}
	}

	public get scale9Grid(): Rectangle | undefined {
		return this._scale9Grid;
	}

	public set scale9Grid(value: Rectangle | undefined) {
		if (this._scale9Grid === value) return;
		this._scale9Grid = value;
		if (this._bitmap) this._bitmap.scale9Grid = value;
		this.invalidateDisplayList();
	}

	public get fillMode(): BitmapFillMode {
		return this._fillMode;
	}

	public set fillMode(value: BitmapFillMode) {
		if (this._fillMode === value) return;
		this._fillMode = value;
		if (this._bitmap) this._bitmap.fillMode = value;
		this.invalidateDisplayList();
	}

	public get smoothing(): boolean {
		return this._smoothing;
	}

	public set smoothing(value: boolean) {
		if (this._smoothing === value) return;
		this._smoothing = value;
		if (this._bitmap) this._bitmap.smoothing = value;
		this.invalidateDisplayList();
	}

	public get bitmap(): Bitmap | undefined {
		return this._bitmap;
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override commitProperties(): void {
		super.commitProperties();
		if (this._sourceChanged) {
			this._sourceChanged = false;
			this._parseSource();
		}
	}

	public override createChildren(): void {
		super.createChildren();
		if (this._sourceChanged) {
			this._sourceChanged = false;
			this._parseSource();
		}
	}

	public override measure(): void {
		const texture = this._bitmap?.texture;
		if (texture) {
			this.setMeasuredSize(texture.textureWidth, texture.textureHeight);
		} else {
			this.setMeasuredSize(0, 0);
		}
	}

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		if (this._bitmap) {
			this._bitmap.width = unscaledWidth;
			this._bitmap.height = unscaledHeight;
		}
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _parseSource(): void {
		const source = this._source;
		if (source && typeof source === 'string') {
			const capturedSource = source;
			getAssetAdapter().getAsset(capturedSource, content => {
				if (this._source !== capturedSource) return;
				this._applyTexture(content ?? undefined);
				if (content) {
					this.dispatchEventWith(Event.COMPLETE);
				}
			});
		} else {
			this._applyTexture((source as Texture) ?? undefined);
		}
	}

	private _applyTexture(texture: Texture | undefined): void {
		if (!this._bitmap) {
			this._bitmap = new Bitmap();
			this._bitmap.smoothing = this._smoothing;
			this._bitmap.fillMode = this._fillMode;
			if (this._scale9Grid) this._bitmap.scale9Grid = this._scale9Grid;
			this.addChild(this._bitmap);
		}
		this._bitmap.texture = texture;
		this.invalidateSize();
		this.invalidateDisplayList();
	}
}
