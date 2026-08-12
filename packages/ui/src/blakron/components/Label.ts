import { Component } from './Component.js';
import { TextField } from '@blakron/core';
import type { HorizontalAlign, VerticalAlign } from '@blakron/core';
import type { IDisplayText } from '../core/IDisplayText.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

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

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(text?: string) {
		super();
		this._textField = new TextField();
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
		}
	}

	public get size(): number {
		return this._textField.size;
	}

	public set size(value: number) {
		if (this._textField.size !== value) {
			this._textField.size = value;
			this.invalidateSize();
		}
	}

	public get bold(): boolean {
		return this._textField.bold;
	}

	public set bold(value: boolean) {
		if (this._textField.bold !== value) {
			this._textField.bold = value;
			this.invalidateSize();
		}
	}

	public get italic(): boolean {
		return this._textField.italic;
	}

	public set italic(value: boolean) {
		if (this._textField.italic !== value) {
			this._textField.italic = value;
			this.invalidateSize();
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
		this._textField.stroke = value;
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

	public get multiline(): boolean {
		return this._textField.multiline;
	}

	public set multiline(value: boolean) {
		if (this._textField.multiline !== value) {
			this._textField.multiline = value;
			this.invalidateSize();
		}
	}

	public get wordWrap(): boolean {
		return this._textField.wordWrap;
	}

	public set wordWrap(value: boolean) {
		if (this._textField.wordWrap !== value) {
			this._textField.wordWrap = value;
			this.invalidateSize();
		}
	}

	public get lineSpacing(): number {
		return this._textField.lineSpacing;
	}

	public set lineSpacing(value: number) {
		if (this._textField.lineSpacing !== value) {
			this._textField.lineSpacing = value;
			this.invalidateSize();
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
		this._textField.displayAsPassword = value;
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override createChildren(): void {
		super.createChildren();
		this.addChild(this._textField);
	}

	public override measure(): void {
		const tf = this._textField;
		// Mirror Egret: determine the available width for wrapping, then
		// temporarily apply it to measure textWidth/textHeight, restoring the
		// original width afterwards so measure() has no lasting side effect.
		const oldWidth = tf.$explicitWidth;
		let availableWidth = NaN;
		if (!isNaN(this._widthConstraint)) {
			availableWidth = this._widthConstraint;
			this._widthConstraint = NaN;
		} else if (!isNaN(this.$explicitWidth)) {
			availableWidth = this.$explicitWidth;
		} else if (this.maxWidth !== 100000) {
			availableWidth = this.maxWidth;
		}
		tf.width = availableWidth;
		this.setMeasuredSize(tf.textWidth, tf.textHeight);
		tf.width = oldWidth;
	}

	public override setLayoutBoundsSize(layoutWidth: number, layoutHeight: number): void {
		super.setLayoutBoundsSize(layoutWidth, layoutHeight);
		// Mirror Egret: track the layout-assigned width so the next measure()
		// can re-measure wrapped text height at that constraint. Skip if the
		// width didn't change or an explicit height is set.
		if (isNaN(layoutWidth) || layoutWidth === this._widthConstraint || layoutWidth === 0) {
			this._widthConstraint = layoutWidth;
			return;
		}
		this._widthConstraint = layoutWidth;
		if (!isNaN(this.$explicitHeight)) return;
		if (layoutWidth === this.measuredWidth) return;
		this.invalidateSize();
	}

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		this._textField.width = unscaledWidth;
		this._textField.height = unscaledHeight;
	}
}
