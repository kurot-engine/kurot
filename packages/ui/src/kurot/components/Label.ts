import { Component } from './Component.js';
import { TextField, TextFieldType } from '@kurot/core';
import { fitLabelText } from '../text/fit-label-text.js';
import type { HorizontalAlign, VerticalAlign } from '@kurot/core';
import type { IDisplayText } from '../core/IDisplayText.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * Optional single-line font fitting policy.
 */
export type TextFitMode = 'none' | 'shrink';

/**
 * Label component for displaying text.
 * Wraps a TextField and integrates it with the UI component lifecycle.
 *
 * States: none (non-interactive visual element).
 */
export class Label extends Component implements IDisplayText {
	// ── Instance fields ───────────────────────────────────────────────────

	protected _textField: TextField;

	private _widthConstraint = NaN;
	private _layoutHeight = NaN;
	private _baseSize: number;
	private _textFit: TextFitMode = 'none';
	private _minFontSize = 12;
	private _textFitOverflow = false;
	private _fitKey?: string;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(text?: string) {
		super();
		this._textField = new TextField();
		this._baseSize = this._textField.size;
		this.touchChildren = false;
		if (text) this.text = text;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get text(): string {
		return this._textField.text;
	}

	public set text(value: string) {
		if (this._textField.text === value) return;
		this._textField.text = value;
		PropertyEvent.dispatchPropertyEvent(this, 'text');
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	public get fontFamily(): string {
		return this._textField.fontFamily;
	}

	public set fontFamily(value: string) {
		if (this._textField.fontFamily !== value) {
			this._textField.fontFamily = value;
			this.invalidateSize();
			this.invalidateDisplayList();
		}
	}

	public get size(): number {
		return this._baseSize;
	}

	public set size(value: number) {
		if (this._baseSize !== value) {
			this._baseSize = value;
			this._textField.size = value;
			this._fitKey = undefined;
			this.invalidateSize();
			this.invalidateDisplayList();
		}
	}

	/**
	 * Shrink applies only to noneditable, single-line text with finite bounds.
	 * Multiline text retains the authored size; editable text rejects shrink.
	 */
	public get textFit(): TextFitMode {
		return this._textFit;
	}

	public set textFit(value: TextFitMode) {
		if (value === 'shrink' && this._textField.type === TextFieldType.INPUT) {
			throw new RangeError('Editable text does not support font shrinking.');
		}
		if (value !== 'none' && value !== 'shrink') {
			throw new RangeError('Label.textFit must be none or shrink.');
		}
		if (this._textFit === value) return;
		this._textFit = value;
		this._fitKey = undefined;
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	/**
	 * Readable lower limit in logical pixels; must be finite and at least one.
	 * A limit above size does not enlarge the text.
	 */
	public get minFontSize(): number {
		return this._minFontSize;
	}

	public set minFontSize(value: number) {
		if (!Number.isFinite(value) || value < 1) {
			throw new RangeError('Label.minFontSize must be finite and at least one.');
		}
		if (this._minFontSize === value) return;
		this._minFontSize = value;
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	/**
	 * Derived drawing size after layout validation; size remains the authored value.
	 */
	public get renderedSize(): number {
		return this._textField.size;
	}

	/**
	 * True after validation when enabled fitting cannot fit even at minFontSize.
	 * Text is then clipped normally; the project decides how to handle overflow.
	 */
	public get textFitOverflow(): boolean {
		return this._textFitOverflow;
	}

	public get bold(): boolean {
		return this._textField.bold;
	}

	public set bold(value: boolean) {
		if (this._textField.bold !== value) {
			this._textField.bold = value;
			this.invalidateSize();
			this.invalidateDisplayList();
		}
	}

	public get italic(): boolean {
		return this._textField.italic;
	}

	public set italic(value: boolean) {
		if (this._textField.italic !== value) {
			this._textField.italic = value;
			this.invalidateSize();
			this.invalidateDisplayList();
		}
	}

	public get textColor(): number {
		return this._textField.textColor;
	}

	public set textColor(value: number) {
		this._textField.textColor = value;
	}

	public get strokeColor(): number {
		return this._textField.strokeColor;
	}

	public set strokeColor(value: number) {
		this._textField.strokeColor = value;
	}

	public get stroke(): number {
		return this._textField.stroke;
	}

	public set stroke(value: number) {
		if (this._textField.stroke === value) return;
		this._textField.stroke = value;
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	public get textAlign(): string {
		return this._textField.textAlign;
	}

	public set textAlign(value: string) {
		if (this._textField.textAlign !== value) {
			this._textField.textAlign = value as HorizontalAlign;
			this.invalidateDisplayList();
		}
	}

	public get verticalAlign(): string {
		return this._textField.verticalAlign;
	}

	public set verticalAlign(value: string) {
		if (this._textField.verticalAlign !== value) {
			this._textField.verticalAlign = value as VerticalAlign;
			this.invalidateDisplayList();
		}
	}

	/**
	 * Defaults to true. False renders only the first hard-separated line,
	 * without automatic wrapping, regardless of the label height.
	 */
	public get multiline(): boolean {
		return this._textField.multiline;
	}

	public set multiline(value: boolean) {
		const changed = this._textField.multiline !== value;
		this._textField.multiline = value;
		if (changed) {
			this.invalidateSize();
			this.invalidateDisplayList();
		}
	}

	/**
	 * In multiline mode, true uses Unicode word boundaries; false wraps by character.
	 */
	public get wordWrap(): boolean {
		return this._textField.wordWrap;
	}

	public set wordWrap(value: boolean) {
		if (this._textField.wordWrap !== value) {
			this._textField.wordWrap = value;
			this.invalidateSize();
			this.invalidateDisplayList();
		}
	}

	public get lineSpacing(): number {
		return this._textField.lineSpacing;
	}

	public set lineSpacing(value: number) {
		if (this._textField.lineSpacing !== value) {
			this._textField.lineSpacing = value;
			this.invalidateSize();
			this.invalidateDisplayList();
		}
	}

	public get maxChars(): number {
		return this._textField.maxChars;
	}

	public set maxChars(value: number) {
		this._textField.maxChars = value;
	}

	public get displayAsPassword(): boolean {
		return this._textField.displayAsPassword;
	}

	public set displayAsPassword(value: boolean) {
		if (this._textField.displayAsPassword === value) return;
		this._textField.displayAsPassword = value;
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override invalidateSize(): void {
		// Font readiness can invalidate metrics without changing the family name.
		this._fitKey = undefined;
		this._textField?.invalidateTextMetrics();
		super.invalidateSize();
	}

	public override createChildren(): void {
		super.createChildren();
		this.addChild(this._textField);
	}

	public override measure(): void {
		const tf = this._textField;
		const oldWidth = tf.$explicitWidth;
		const availableWidth = Number.isFinite(this._widthConstraint)
			? this._widthConstraint
			: Number.isFinite(this.$explicitWidth)
				? this.$explicitWidth
				: this.maxWidth !== 100000
					? this.maxWidth
					: NaN;
		const availableHeight = Number.isFinite(this._layoutHeight)
			? this._layoutHeight
			: Number.isFinite(this.$explicitHeight)
				? this.$explicitHeight
				: this.maxHeight !== 100000
					? this.maxHeight
					: NaN;
		this._applyTextFit(availableWidth, availableHeight);
		try {
			tf.width = availableWidth;
			this.setMeasuredSize(tf.textWidth, tf.textHeight);
		} finally {
			tf.width = oldWidth;
		}
	}

	public override setLayoutBoundsSize(layoutWidth: number, layoutHeight: number): void {
		super.setLayoutBoundsSize(layoutWidth, layoutHeight);
		// Parent layout bounds may be transformed or clamped by min/max limits.
		// Fitting uses the resolved local size, never the parent's raw dimensions.
		const width = Number.isFinite(layoutWidth) ? this.width : NaN;
		const height = Number.isFinite(layoutHeight) ? this.height : NaN;
		const widthChanged = !Object.is(this._widthConstraint, width);
		const heightChanged = !Object.is(this._layoutHeight, height);
		this._widthConstraint = width;
		this._layoutHeight = height;
		if ((widthChanged || heightChanged) && (this.multiline || this.textFit === 'shrink')) {
			this.invalidateSize();
			this.invalidateDisplayList();
		}
	}

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		// Automatic axes must not feed their own measured size back into fitting.
		const fitWidth =
			Number.isFinite(this._widthConstraint) || Number.isFinite(this.$explicitWidth)
				? unscaledWidth
				: this.maxWidth !== 100000
					? this.maxWidth
					: NaN;
		const fitHeight =
			Number.isFinite(this._layoutHeight) || Number.isFinite(this.$explicitHeight)
				? unscaledHeight
				: this.maxHeight !== 100000
					? this.maxHeight
					: NaN;
		const previousSize = this.renderedSize;
		this._applyTextFit(fitWidth, fitHeight);
		if (previousSize !== this.renderedSize && (isNaN(this.$explicitWidth) || isNaN(this.$explicitHeight))) {
			this.invalidateSize();
		}
		this._textField.width = unscaledWidth;
		this._textField.height = unscaledHeight;
	}

	// ── Private methods ────────────────────────────────────────────────────

	private _applyTextFit(width: number, height: number): void {
		const tf = this._textField;
		if (this.textFit !== 'shrink' || this.multiline || tf.type === TextFieldType.INPUT) {
			tf.size = this._baseSize;
			this._textFitOverflow = false;
			this._fitKey = undefined;
			return;
		}
		const text = tf.displayAsPassword
			? '*'.repeat(this.text.length)
			: this.text.split(/\r\n|[\n\r\v\f\u0085\u2028\u2029]/, 1)[0];
		const key = JSON.stringify([
			text,
			tf.fontFamily,
			this.size,
			this.minFontSize,
			tf.bold,
			tf.italic,
			tf.stroke,
			width,
			height,
		]);
		if (key === this._fitKey) return;
		const fitted = fitLabelText({
			text,
			fontFamily: tf.fontFamily,
			size: this.size,
			minimum: this.minFontSize,
			bold: tf.bold,
			italic: tf.italic,
			stroke: tf.stroke,
			width,
			height,
		});
		tf.size = fitted.size;
		this._textFitOverflow = fitted.overflow;
		this._fitKey = key;
	}
}
