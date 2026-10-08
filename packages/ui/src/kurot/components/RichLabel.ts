import { TextField } from '@kurot/core';
import type { HorizontalAlign, ITextElement, VerticalAlign } from '@kurot/core';
import { Component } from './Component.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * Displays styled text runs in one continuous layout. Content is assigned only
 * through textFlow; ordinary Label text and appearance presets are not exposed.
 * Unspecified run styles use the TextField defaults captured at construction.
 */
export class RichLabel extends Component {
	// ── Instance fields ───────────────────────────────────────────────────────

	private readonly _textField = new TextField();
	private _widthConstraint = NaN;
	private _measurement?: { width: number; height: number };
	private _measurementWidth = NaN;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(textFlow: readonly ITextElement[] = []) {
		super();
		this.touchChildren = false;
		this._textField.wordWrap = true;
		this.textFlow = textFlow;
	}

	// ── Getters / Setters ──────────────────────────────────────────────────────

	public override get width(): number {
		return super.width;
	}
	public override set width(value: number) {
		if (Object.is(this.$explicitWidth, value)) return;
		super.width = value;
		// Component width changes alone do not invalidate automatic text height.
		this._invalidateText();
	}

	/**
	 * Assignment and reads copy the runs and their styles. Reassign an edited
	 * snapshot to update the component; [] clears all content.
	 */
	public get textFlow(): ITextElement[] {
		return this._copyTextFlow(this._textField.textFlow ?? []);
	}
	public set textFlow(value: readonly ITextElement[]) {
		this._textField.textFlow = this._copyTextFlow(value);
		this.invalidateSize();
		this.invalidateDisplayList();
		PropertyEvent.dispatchPropertyEvent(this, 'textFlow');
	}

	public get multiline(): boolean {
		return this._textField.multiline;
	}
	public set multiline(value: boolean) {
		if (this.multiline === value) return;
		this._textField.multiline = value;
		this._invalidateText();
	}

	/**
	 * True uses Unicode line-break opportunities; false wraps by graphemes.
	 * Explicit multiline=false displays only the first unwrapped hard line.
	 */
	public get wordWrap(): boolean {
		return this._textField.wordWrap;
	}
	public set wordWrap(value: boolean) {
		if (this.wordWrap === value) return;
		this._textField.wordWrap = value;
		this._invalidateText();
	}

	public get lineSpacing(): number {
		return this._textField.lineSpacing;
	}
	public set lineSpacing(value: number) {
		if (!Number.isFinite(value) || value < 0) {
			throw new RangeError('RichLabel.lineSpacing must be finite and nonnegative.');
		}
		if (this.lineSpacing === value) return;
		this._textField.lineSpacing = value;
		this._invalidateText();
	}

	public get textAlign(): 'left' | 'center' | 'right' {
		return this._textField.textAlign as 'left' | 'center' | 'right';
	}
	public set textAlign(value: 'left' | 'center' | 'right') {
		if (this.textAlign === value) return;
		if (!['left', 'center', 'right'].includes(value)) {
			throw new RangeError('Invalid rich text alignment.');
		}
		this._textField.textAlign = value as HorizontalAlign;
		this.invalidateDisplayList();
	}

	public get verticalAlign(): 'top' | 'middle' | 'bottom' {
		return this._textField.verticalAlign as 'top' | 'middle' | 'bottom';
	}
	public set verticalAlign(value: 'top' | 'middle' | 'bottom') {
		if (this.verticalAlign === value) return;
		if (!['top', 'middle', 'bottom'].includes(value)) {
			throw new RangeError('Invalid rich text vertical alignment.');
		}
		this._textField.verticalAlign = value as VerticalAlign;
		this.invalidateDisplayList();
	}

	/**
	 * Complete content metrics under the current width constraint, before
	 * height clipping. Empty content has zero width and height.
	 */
	public get textWidth(): number {
		return this._measureText().width;
	}
	public get textHeight(): number {
		return this._measureText().height;
	}

	// ── Override methods ──────────────────────────────────────────────────────

	public override invalidateSize(): void {
		// A late font load can change metrics without changing the authored runs.
		this._measurement = undefined;
		this._textField?.invalidateTextMetrics();
		super.invalidateSize();
	}

	public override createChildren(): void {
		super.createChildren();
		this.addChild(this._textField);
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
		this._textField.width = unscaledWidth;
		this._textField.height = unscaledHeight;
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _copyTextFlow(value: readonly ITextElement[]): ITextElement[] {
		return value.map(element => {
			if (typeof element.text !== 'string') {
				throw new TypeError('RichLabel text runs must contain string text.');
			}
			return element.style ? { text: element.text, style: { ...element.style } } : { text: element.text };
		});
	}

	private _invalidateText(): void {
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	private _measureText(): { width: number; height: number } {
		if (!this._textField.text) return { width: 0, height: 0 };

		const width = Number.isFinite(this._widthConstraint)
			? this._widthConstraint
			: Number.isFinite(this.$explicitWidth)
				? this.$explicitWidth
				: this.maxWidth !== 100000
					? this.maxWidth
					: NaN;
		if (!this._measurement || !Object.is(this._measurementWidth, width)) {
			this._measurement = this._textField.measureText(width);
			this._measurementWidth = width;
		}
		return this._measurement;
	}
}
