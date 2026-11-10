import { TextField } from '@kurot/core';
import type { HorizontalAlign, ITextElement, VerticalAlign } from '@kurot/core';
import { Component } from './Component.js';
import { getUIContext } from '../core/UIContext.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import { getRichLabelOutlineInsets } from '../text/rich-label-outline.js';
import type { OutlineInsets } from '../text/outline-insets.js';

/**
 * Whether outlines only extend painting or reserve space in the UI outer box.
 */
export type OutlineLayout = 'render-only' | 'reserve-space';

/**
 * Displays styled text runs in one continuous layout. Content is assigned only
 * through textFlow; seven component typography properties supply omitted run
 * styles. Label plain text, presets and fitting are not exposed.
 */
export class RichLabel extends Component {
	private static _defaultOutlineLayout: OutlineLayout = 'render-only';

	/**
	 * Startup default for subsequently constructed RichLabels. Existing instances
	 * keep their captured policy. A construction UIContext can override this
	 * shared-runtime default; use explicit context policies for isolated apps.
	 */
	public static get defaultOutlineLayout(): OutlineLayout {
		return RichLabel._defaultOutlineLayout;
	}
	public static set defaultOutlineLayout(value: OutlineLayout) {
		validateOutlineLayout(value);
		RichLabel._defaultOutlineLayout = value;
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	private readonly _textField = new TextField();

	private _layoutWidth = NaN;
	private _measureLayout = false;
	private _measuredWidthConstraint = NaN;
	private _preferredWidth = 0;
	private _measurement?: { width: number; height: number };
	private _measurementWidth = NaN;
	private _outlineLayout: OutlineLayout;
	private _outlineInsets?: OutlineInsets;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(textFlow: readonly ITextElement[] = []) {
		super();
		const options = getUIContext(this)?.options;
		this._outlineLayout = options?.richLabelOutlineLayout ?? RichLabel.defaultOutlineLayout;
		validateOutlineLayout(this._outlineLayout);
		const family = options?.fontFamily;
		if (family) {
			this._textField.fontFamily = family;
		}
		this.touchChildren = false;
		this._textField.wordWrap = true;
		this.textFlow = textFlow;
	}

	// ── Getters / Setters ──────────────────────────────────────────────────────

	/**
	 * Captured from the construction context or startup default, initially
	 * render-only. reserve-space uses Label's outline-safe content box, including
	 * effective run styles. Assignment remeasures this instance and its parent;
	 * it does not change the authored runs or add font fitting.
	 */
	public get outlineLayout(): OutlineLayout {
		return this._outlineLayout;
	}
	public set outlineLayout(value: OutlineLayout) {
		validateOutlineLayout(value);
		if (this._outlineLayout === value) {
			return;
		}
		this._outlineLayout = value;
		this._invalidateText();
		PropertyEvent.dispatchPropertyEvent(this, 'outlineLayout');
	}

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

	/**
	 * CSS font family used by runs without an explicit family. Initially captured
	 * from UIContext or Core at construction. Assignment does not load fonts.
	 * After late font readiness, call invalidateSize() to refresh measurement.
	 */
	public get fontFamily(): string {
		return this._textField.fontFamily;
	}
	public set fontFamily(value: string) {
		if (typeof value !== 'string') {
			throw new TypeError('RichLabel.fontFamily must be a CSS font-family string.');
		}
		if (this.fontFamily === value) {
			return;
		}
		this._textField.fontFamily = value;
		this._invalidateText();
		PropertyEvent.dispatchPropertyEvent(this, 'fontFamily');
	}

	/**
	 * Font size in logical pixels for runs without a size. Initially Core's
	 * construction-time default (normally 30); must be finite and nonnegative.
	 * An explicitly sized run retains its size, even if it equals this value.
	 */
	public get size(): number {
		return this._textField.size;
	}
	public set size(value: number) {
		this._validateStyleNumber(value, 'size');
		if (this.size === value) {
			return;
		}
		this._textField.size = value;
		this._invalidateText();
		PropertyEvent.dispatchPropertyEvent(this, 'size');
	}

	/**
	 * Bold face for runs without an explicit flag, initially false. A local false
	 * overrides a true component value; omission follows the component.
	 */
	public get bold(): boolean {
		return this._textField.bold;
	}
	public set bold(value: boolean) {
		this._validateStyleBoolean(value, 'bold');
		if (this.bold === value) {
			return;
		}
		this._textField.bold = value;
		this._invalidateText();
		PropertyEvent.dispatchPropertyEvent(this, 'bold');
	}

	/**
	 * Italic face for runs without an explicit flag, initially false. A local
	 * false overrides a true component value.
	 */
	public get italic(): boolean {
		return this._textField.italic;
	}
	public set italic(value: boolean) {
		this._validateStyleBoolean(value, 'italic');
		if (this.italic === value) {
			return;
		}
		this._textField.italic = value;
		this._invalidateText();
		PropertyEvent.dispatchPropertyEvent(this, 'italic');
	}

	/**
	 * RGB fill for runs without a textColor, initially Core's construction-time
	 * default (normally white). Accepts integers from 0 to 0xffffff; zero is black.
	 */
	public get textColor(): number {
		return this._textField.textColor;
	}
	public set textColor(value: number) {
		this._validateStyleNumber(value, 'textColor', true);
		if (this.textColor === value) {
			return;
		}
		this._textField.textColor = value;
		this.invalidateDisplayList();
		PropertyEvent.dispatchPropertyEvent(this, 'textColor');
	}

	/**
	 * Outline width in logical pixels for runs without a stroke, initially zero.
	 * Must be finite and nonnegative. With outlineLayout=reserve-space, effective
	 * run outlines also contribute to measurement and the inner content frame.
	 */
	public get stroke(): number {
		return this._textField.stroke;
	}
	public set stroke(value: number) {
		this._validateStyleNumber(value, 'stroke');
		if (this.stroke === value) {
			return;
		}
		this._textField.stroke = value;
		if (this._outlineLayout === 'reserve-space') {
			this.invalidateSize();
		}
		this.invalidateDisplayList();
		PropertyEvent.dispatchPropertyEvent(this, 'stroke');
	}

	/**
	 * RGB outline color for runs without a strokeColor, initially black.
	 * Accepts integers from 0 to 0xffffff; zero remains an explicit black value.
	 */
	public get strokeColor(): number {
		return this._textField.strokeColor;
	}
	public set strokeColor(value: number) {
		this._validateStyleNumber(value, 'strokeColor', true);
		if (this.strokeColor === value) {
			return;
		}
		this._textField.strokeColor = value;
		this.invalidateDisplayList();
		PropertyEvent.dispatchPropertyEvent(this, 'strokeColor');
	}

	/**
	 * Whether to generate multiple rows; defaults to true. False displays only the
	 * first unwrapped hard-separated line, regardless of the available height.
	 */
	public get multiline(): boolean {
		return this._textField.multiline;
	}
	public set multiline(value: boolean) {
		if (this.multiline === value) return;
		this._textField.multiline = value;
		this._invalidateText();
	}

	/**
	 * Whether to use Unicode line-break opportunities; defaults to true. False wraps
	 * by graphemes. Explicit multiline=false shows only the first unwrapped hard line.
	 */
	public get wordWrap(): boolean {
		return this._textField.wordWrap;
	}
	public set wordWrap(value: boolean) {
		if (this.wordWrap === value) return;
		this._textField.wordWrap = value;
		this._invalidateText();
	}

	/**
	 * Extra spacing between rows in logical pixels; defaults to 0. Negative or
	 * non-finite values throw RangeError.
	 */
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

	/**
	 * Horizontal alignment, defaulting to left. Only left, center and right are
	 * accepted; other values throw RangeError.
	 */
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

	/**
	 * Stable font-frame alignment inherited from Core; defaults to middle.
	 * Only top, middle and bottom are accepted; other values throw RangeError.
	 */
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
	 * height clipping and excluding outline insets. Empty content has zero width
	 * and height; reserve-space measures inside the current outer width.
	 */
	public get textWidth(): number {
		return this._measureText().width;
	}
	/**
	 * Complete content height in logical pixels at the current width constraint,
	 * before height clipping. Empty text has height 0.
	 */
	public get textHeight(): number {
		return this._measureText().height;
	}

	// ── Override methods ──────────────────────────────────────────────────────

	public override invalidateSize(): void {
		this._measureLayout = false;
		// A late font load can change metrics without changing the authored runs.
		this._measurement = undefined;
		this._outlineInsets = undefined;
		this._textField?.invalidateTextMetrics();
		super.invalidateSize();
	}

	public override createChildren(): void {
		super.createChildren();
		this.addChild(this._textField);
	}

	public override measure(): void {
		const reflow = this._measureLayout;
		const width = this._getMeasureWidth(this._measureLayout ? this._layoutWidth : NaN);
		this._measureLayout = false;
		this._measuredWidthConstraint = this._getContentWidth(width);
		const measured = this._measureText(width);
		const inset = this._getOutlineInsets();
		// Keep preferred width independent of wrapping in the current allocation,
		// so an automatic parent can expand after content or constraint changes.
		if (!reflow || !Number.isFinite(this._layoutWidth)) {
			this._preferredWidth = measured.width + inset.x * 2;
		}
		this.setMeasuredSize(this._preferredWidth, measured.height + inset.y * 2);
		if (!reflow && Number.isFinite(this._layoutWidth)) {
			this.ui.$invalidateParentLayout();
		}
	}

	public override setLayoutBoundsSize(layoutWidth: number, layoutHeight: number): void {
		super.setLayoutBoundsSize(layoutWidth, layoutHeight);
		const width = Number.isFinite(layoutWidth) ? this.width : NaN;
		this._layoutWidth = width;
		// New preferred metrics must be reflowed even if the allocation is unchanged.
		if (!Object.is(this._measuredWidthConstraint, this._getContentWidth(this._getMeasureWidth(width)))) {
			this._measureLayout = true;
			super.invalidateSize();
			this.invalidateDisplayList();
		}
	}

	public override updateDisplayList(unscaledWidth: number, unscaledHeight: number): void {
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		const inset = this._getOutlineInsets();
		this._textField.x = inset.x;
		this._textField.y = inset.y;
		this._textField.width = Math.max(0, unscaledWidth - inset.x * 2);
		this._textField.height = Math.max(0, unscaledHeight - inset.y * 2);
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _validateStyleNumber(value: number, property: string, color = false): void {
		if (!Number.isFinite(value) || value < 0 || (color && (!Number.isInteger(value) || value > 0xffffff))) {
			throw new RangeError(
				`RichLabel.${property} must be ${color ? 'an RGB integer' : 'finite and nonnegative'}.`,
			);
		}
	}

	private _validateStyleBoolean(value: boolean, property: string): void {
		if (typeof value !== 'boolean') {
			throw new TypeError(`RichLabel.${property} must be boolean.`);
		}
	}

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

	private _getMeasureWidth(layoutWidth: number): number {
		return Number.isFinite(layoutWidth)
			? layoutWidth
			: Number.isFinite(this.$explicitWidth)
				? this.$explicitWidth
				: this.maxWidth !== 100000
					? this.maxWidth
					: NaN;
	}

	private _measureText(width: number = this._getMeasureWidth(this._layoutWidth)): { width: number; height: number } {
		if (!this._textField.text) {
			return { width: 0, height: 0 };
		}
		const contentWidth = this._getContentWidth(width);
		if (!this._measurement || !Object.is(this._measurementWidth, contentWidth)) {
			this._measurement = this._textField.measureText(contentWidth);
			this._measurementWidth = contentWidth;
		}
		return this._measurement;
	}

	private _getContentWidth(width: number): number {
		return Number.isFinite(width) ? Math.max(0, width - this._getOutlineInsets().x * 2) : NaN;
	}

	private _getOutlineInsets(): OutlineInsets {
		return this._outlineInsets ??= this._outlineLayout === 'reserve-space'
			? getRichLabelOutlineInsets(this._textField)
			: { x: 0, y: 0 };
	}
}

function validateOutlineLayout(value: OutlineLayout): void {
	if (value !== 'render-only' && value !== 'reserve-space') {
		throw new RangeError('RichLabel outline layout must be render-only or reserve-space.');
	}
}
