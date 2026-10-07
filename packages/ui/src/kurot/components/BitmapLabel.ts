import { BitmapFont, BitmapText, Event, IOErrorEvent, resource } from '@kurot/core';
import { Component } from './Component.js';
import type { IDisplayText } from '../core/IDisplayText.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * UI layout wrapper around BitmapText. String fonts are configured resource
 * names; FontAnalyzer loads the descriptor and its page. Font ownership stays
 * with the resource cache or the caller that supplied a BitmapFont.
 */
export class BitmapLabel extends Component implements IDisplayText {
	// ── Instance fields ──────────────────────────────────────────────────────
	private readonly _bitmapText = new BitmapText();
	private _font?: string | BitmapFont;
	private _fontChanged = false;
	private _fontRequest = 0;
	private _widthConstraint = NaN;

	// ── Constructor ──────────────────────────────────────────────────────────
	public constructor(text = '') {
		super();
		this.touchChildren = false;
		this.text = text;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────
	public get text(): string {
		return this._bitmapText.text;
	}
	public set text(value: string) {
		if (this.text === value) return;
		this._bitmapText.text = value;
		PropertyEvent.dispatchPropertyEvent(this, 'text');
		this._invalidateText();
	}
	public get font(): string | BitmapFont | undefined {
		return this._font;
	}
	public set font(value: string | BitmapFont | undefined) {
		if (this._font === value) return;
		this._font = value;
		this._fontRequest++;
		this._fontChanged = typeof value === 'string';
		this._bitmapText.font = value instanceof BitmapFont ? value : undefined;
		this.invalidateProperties();
		this._invalidateText();
	}
	public get textAlign(): 'left' | 'center' | 'right' {
		return this._bitmapText.textAlign;
	}
	public set textAlign(value: 'left' | 'center' | 'right') {
		if (this.textAlign === value) return;
		this._bitmapText.textAlign = value;
		this.invalidateDisplayList();
	}
	public get verticalAlign(): 'top' | 'middle' | 'bottom' {
		return this._bitmapText.verticalAlign;
	}
	public set verticalAlign(value: 'top' | 'middle' | 'bottom') {
		if (this.verticalAlign === value) return;
		this._bitmapText.verticalAlign = value;
		this.invalidateDisplayList();
	}
	public get letterSpacing(): number {
		return this._bitmapText.letterSpacing;
	}
	public set letterSpacing(value: number) {
		if (this.letterSpacing === value) return;
		this._bitmapText.letterSpacing = value;
		this._invalidateText();
	}
	public get lineSpacing(): number {
		return this._bitmapText.lineSpacing;
	}
	public set lineSpacing(value: number) {
		if (this.lineSpacing === value) return;
		this._bitmapText.lineSpacing = value;
		this._invalidateText();
	}
	public get multiline(): boolean {
		return this._bitmapText.multiline;
	}
	public set multiline(value: boolean) {
		if (this.multiline === value) return;
		this._bitmapText.multiline = value;
		this._invalidateText();
	}
	public get smoothing(): boolean {
		return this._bitmapText.smoothing;
	}
	public set smoothing(value: boolean) {
		if (this.smoothing === value) return;
		this._bitmapText.smoothing = value;
		this.invalidateDisplayList();
	}
	/**
	 * Content metrics under the label's width constraint, before height clipping.
	 */
	public get textWidth(): number {
		return this._measureText().width;
	}
	public get textHeight(): number {
		return this._measureText().height;
	}

	// ── Override methods ─────────────────────────────────────────────────────
	public override createChildren(): void {
		super.createChildren();
		this.addChild(this._bitmapText);
	}
	public override commitProperties(): void {
		super.commitProperties();
		if (!this._fontChanged) return;
		this._fontChanged = false;
		this._resolveFont();
	}
	public override measure(): void {
		const measured = this._measureText();
		this.setMeasuredSize(measured.width, measured.height);
	}
	public override setLayoutBoundsSize(layoutWidth: number, layoutHeight: number): void {
		super.setLayoutBoundsSize(layoutWidth, layoutHeight);
		const width = Number.isFinite(layoutWidth) ? this.width : NaN;
		if (Object.is(this._widthConstraint, width)) return;
		this._widthConstraint = width;
		this._invalidateText();
	}
	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		this._bitmapText.width = unscaledWidth;
		this._bitmapText.height = unscaledHeight;
	}

	// ── Private methods ──────────────────────────────────────────────────────
	private _invalidateText(): void {
		this.invalidateSize();
		this.invalidateDisplayList();
	}
	private _measureText(): { width: number; height: number } {
		const width = Number.isFinite(this._widthConstraint) ? this._widthConstraint : this.$explicitWidth;
		const layout = this._bitmapText.measureText(width);
		return { width: layout.width, height: layout.height };
	}
	private _resolveFont(): void {
		const name = this._font;
		if (typeof name !== 'string') return;
		const request = this._fontRequest;
		const apply = (font: unknown): void => {
			if (request !== this._fontRequest) return;
			if (!(font instanceof BitmapFont)) throw new TypeError(`Resource ${name} is not a bitmap font.`);
			this._bitmapText.font = font;
			this._invalidateText();
			this.dispatchEventWith(Event.COMPLETE);
		};
		const cached = resource.get(name);
		const report = (error: unknown): void => {
			if (request !== this._fontRequest) return;
			this.dispatchEventWith(IOErrorEvent.IO_ERROR, false, { source: name, error });
		};
		if (cached !== undefined) {
			try {
				apply(cached);
			} catch (error) {
				report(error);
			}
			return;
		}
		void resource.load(name).then(apply).catch(report);
	}
}
