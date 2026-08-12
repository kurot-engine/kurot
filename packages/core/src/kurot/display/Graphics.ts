import { Matrix } from '../geom/Matrix.js';
import { Point } from '../geom/Point.js';
import { Rectangle } from '../geom/Rectangle.js';
import { PathCommandType, type GraphicsCommand } from './GraphicsPath.js';
import type { DisplayObject } from './DisplayObject.js';

/** @internal Injected by CanvasRenderer at startup to avoid circular dependency. */
export let graphicsHitTest: ((graphics: Graphics, localX: number, localY: number) => boolean) | undefined;

export function setGraphicsHitTest(fn: (graphics: Graphics, localX: number, localY: number) => boolean): void {
	graphicsHitTest = fn;
}

function clampAngle(value: number): number {
	value %= Math.PI * 2;
	if (value < 0) {
		value += Math.PI * 2;
	}
	return value;
}

function getCurvePoint(v0: number, v1: number, v2: number, t: number): number {
	return (1 - t) ** 2 * v0 + 2 * t * (1 - t) * v1 + t ** 2 * v2;
}

function getCubicCurvePoint(v0: number, v1: number, v2: number, v3: number, t: number): number {
	return (1 - t) ** 3 * v0 + 3 * t * (1 - t) ** 2 * v1 + 3 * (1 - t) * t ** 2 * v2 + t ** 3 * v3;
}

function createBezierPoints(data: number[], count: number): Point[] {
	const points: Point[] = [];
	for (let i = 0; i < count; i++) {
		const t = i / count;
		let x = 0,
			y = 0;
		if (data.length === 6) {
			x = getCurvePoint(data[0], data[2], data[4], t);
			y = getCurvePoint(data[1], data[3], data[5], t);
		} else if (data.length === 8) {
			x = getCubicCurvePoint(data[0], data[2], data[4], data[6], t);
			y = getCubicCurvePoint(data[1], data[3], data[5], data[7], t);
		}
		points.push(Point.create(x, y));
	}
	return points;
}

export class Graphics {
	// ── Instance fields ───────────────────────────────────────────────────────

	targetDisplay?: DisplayObject;

	readonly commands: GraphicsCommand[] = [];

	canvasCacheDirty = true;

	offscreenCanvas?: HTMLCanvasElement;
	offscreenCtx?: CanvasRenderingContext2D;
	offscreenBoundsX = 0;
	offscreenBoundsY = 0;

	private _lastX = 0;
	private _lastY = 0;
	private _minX = Infinity;
	private _minY = Infinity;
	private _maxX = -Infinity;
	private _maxY = -Infinity;
	private _topLeftStrokeWidth = 0;
	private _bottomRightStrokeWidth = 0;
	private _includeLastPosition = true;

	// ── Public methods ────────────────────────────────────────────────────────

	public beginFill(color: number, alpha = 1): void {
		this.commands.push({ type: PathCommandType.BeginFill, color: +color || 0, alpha: +alpha || 0 });
		this.dirty();
	}

	public beginGradientFill(
		gradientType: string,
		colors: number[],
		alphas: number[],
		ratios: number[],
		matrix?: Matrix,
	): void {
		this.commands.push({ type: PathCommandType.BeginGradientFill, gradientType, colors, alphas, ratios, matrix });
		this.dirty();
	}

	public endFill(): void {
		this.commands.push({ type: PathCommandType.EndFill });
		this.dirty();
	}

	public lineStyle(
		thickness: number = NaN,
		color: number = 0,
		alpha: number = 1,
		_pixelHinting: boolean = false,
		_scaleMode: string = 'normal',
		caps?: string,
		joints?: string,
		miterLimit = 3,
		lineDash?: number[],
	): void {
		thickness = +thickness || 0;
		if (thickness <= 0) {
			this.setStrokeWidth(0);
		} else {
			this.setStrokeWidth(thickness);
			this.commands.push({
				type: PathCommandType.LineStyle,
				thickness,
				color: +color || 0,
				alpha: +alpha || 0,
				caps,
				joints,
				miterLimit: +miterLimit || 0,
				lineDash,
			});
		}
		this.dirty();
	}

	public drawRect(x: number, y: number, width: number, height: number): void {
		x = +x || 0;
		y = +y || 0;
		width = +width || 0;
		height = +height || 0;
		this.commands.push({ type: PathCommandType.DrawRect, x, y, w: width, h: height });
		this.extendBoundsByPoint(x + width, y + height);
		this.updatePosition(x, y);
		this.dirty();
	}

	public drawRoundRect(
		x: number,
		y: number,
		width: number,
		height: number,
		ellipseWidth: number,
		ellipseHeight?: number,
	): void {
		x = +x || 0;
		y = +y || 0;
		width = +width || 0;
		height = +height || 0;
		ellipseWidth = +ellipseWidth || 0;
		const eh = ellipseHeight !== undefined ? +ellipseHeight || 0 : ellipseWidth;
		this.commands.push({ type: PathCommandType.DrawRoundRect, x, y, w: width, h: height, ew: ellipseWidth, eh });
		this.extendBoundsByPoint(x, y);
		this.extendBoundsByPoint(x + width, y + height);
		this.updatePosition(x + width, y + height - ((eh * 0.5) | 0));
		this.dirty();
	}

	public drawCircle(x: number, y: number, radius: number): void {
		x = +x || 0;
		y = +y || 0;
		radius = +radius || 0;
		this.commands.push({ type: PathCommandType.DrawCircle, x, y, r: radius });
		this.extendBoundsByPoint(x - radius - 1, y - radius - 1);
		this.extendBoundsByPoint(x + radius + 2, y + radius + 2);
		this.updatePosition(x + radius, y);
		this.dirty();
	}

	public drawEllipse(x: number, y: number, width: number, height: number): void {
		x = +x || 0;
		y = +y || 0;
		width = +width || 0;
		height = +height || 0;
		this.commands.push({ type: PathCommandType.DrawEllipse, x, y, w: width, h: height });
		this.extendBoundsByPoint(x - 1, y - 1);
		this.extendBoundsByPoint(x + width + 2, y + height + 2);
		this.updatePosition(x + width, y + height * 0.5);
		this.dirty();
	}

	public moveTo(x: number, y: number): void {
		x = +x || 0;
		y = +y || 0;
		this.commands.push({ type: PathCommandType.MoveTo, x, y });
		this._includeLastPosition = false;
		this._lastX = x;
		this._lastY = y;
		this.dirty();
	}

	public lineTo(x: number, y: number): void {
		x = +x || 0;
		y = +y || 0;
		this.commands.push({ type: PathCommandType.LineTo, x, y });
		this.updatePosition(x, y);
		this.dirty();
	}

	public curveTo(controlX: number, controlY: number, anchorX: number, anchorY: number): void {
		controlX = +controlX || 0;
		controlY = +controlY || 0;
		anchorX = +anchorX || 0;
		anchorY = +anchorY || 0;
		this.commands.push({ type: PathCommandType.CurveTo, cx: controlX, cy: controlY, ax: anchorX, ay: anchorY });
		const pts = createBezierPoints([this._lastX, this._lastY, controlX, controlY, anchorX, anchorY], 50);
		for (const p of pts) {
			this.extendBoundsByPoint(p.x, p.y);
			Point.release(p);
		}
		this.extendBoundsByPoint(anchorX, anchorY);
		this.updatePosition(anchorX, anchorY);
		this.dirty();
	}

	public cubicCurveTo(cx1: number, cy1: number, cx2: number, cy2: number, ax: number, ay: number): void {
		cx1 = +cx1 || 0;
		cy1 = +cy1 || 0;
		cx2 = +cx2 || 0;
		cy2 = +cy2 || 0;
		ax = +ax || 0;
		ay = +ay || 0;
		this.commands.push({ type: PathCommandType.CubicCurveTo, cx1, cy1, cx2, cy2, ax, ay });
		const pts = createBezierPoints([this._lastX, this._lastY, cx1, cy1, cx2, cy2, ax, ay], 50);
		for (const p of pts) {
			this.extendBoundsByPoint(p.x, p.y);
			Point.release(p);
		}
		this.extendBoundsByPoint(ax, ay);
		this.updatePosition(ax, ay);
		this.dirty();
	}

	public drawArc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		anticlockwise = false,
	): void {
		if (radius < 0 || startAngle === endAngle) {
			return;
		}
		x = +x || 0;
		y = +y || 0;
		radius = +radius || 0;
		startAngle = clampAngle(+startAngle || 0);
		endAngle = clampAngle(+endAngle || 0);
		this.commands.push({
			type: PathCommandType.DrawArc,
			x,
			y,
			r: radius,
			start: startAngle,
			end: endAngle,
			ccw: anticlockwise,
		});
		if (anticlockwise) {
			this.arcBounds(x, y, radius, endAngle, startAngle);
		} else {
			this.arcBounds(x, y, radius, startAngle, endAngle);
		}
		this.updatePosition(x + Math.cos(endAngle) * radius, y + Math.sin(endAngle) * radius);
		this.dirty();
	}

	public clear(): void {
		this.commands.length = 0;
		this._lastX = 0;
		this._lastY = 0;
		this._minX = Infinity;
		this._minY = Infinity;
		this._maxX = -Infinity;
		this._maxY = -Infinity;
		if (this.offscreenCanvas) {
			this.offscreenCanvas.width = 0;
			this.offscreenCanvas.height = 0;
		}
		this.canvasCacheDirty = true;
		this.dirty();
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	$measureContentBounds(bounds: Rectangle): void {
		if (this._minX === Infinity) {
			bounds.setEmpty();
		} else {
			bounds.setTo(this._minX, this._minY, this._maxX - this._minX, this._maxY - this._minY);
		}
	}

	$hitTest(localX: number, localY: number): boolean {
		if (!graphicsHitTest || this.commands.length === 0) {
			return false;
		}
		return graphicsHitTest(this, localX, localY);
	}

	$onRemoveFromStage(): void {
		// Do not clear commands — the Shape may be re-added to the display list
		// and needs its graphics to remain intact for re-rendering.
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private setStrokeWidth(width: number): void {
		if (width === 1) {
			this._topLeftStrokeWidth = 0;
			this._bottomRightStrokeWidth = 1;
		} else if (width === 3) {
			this._topLeftStrokeWidth = 1;
			this._bottomRightStrokeWidth = 2;
		} else {
			const half = Math.ceil(width * 0.5) | 0;
			this._topLeftStrokeWidth = half;
			this._bottomRightStrokeWidth = half;
		}
	}

	private dirty(): void {
		this.canvasCacheDirty = true;
		if (!this.targetDisplay) {
			return;
		}
		this.targetDisplay.$cacheDirty = true;
		this.targetDisplay.$renderDirty = true;
		this.targetDisplay.$markDirty();
	}

	private extendBoundsByPoint(x: number, y: number): void {
		this._minX = Math.min(this._minX, x - this._topLeftStrokeWidth);
		this._maxX = Math.max(this._maxX, x + this._bottomRightStrokeWidth);
		this._minY = Math.min(this._minY, y - this._topLeftStrokeWidth);
		this._maxY = Math.max(this._maxY, y + this._bottomRightStrokeWidth);
	}

	private updatePosition(x: number, y: number): void {
		if (!this._includeLastPosition) {
			this.extendBoundsByPoint(this._lastX, this._lastY);
			this._includeLastPosition = true;
		}
		this._lastX = x;
		this._lastY = y;
		this.extendBoundsByPoint(x, y);
	}

	private arcBounds(x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
		const PI = Math.PI;
		if (Math.abs(startAngle - endAngle) < 0.01) {
			this.extendBoundsByPoint(x - radius, y - radius);
			this.extendBoundsByPoint(x + radius, y + radius);
			return;
		}
		if (startAngle > endAngle) {
			endAngle += PI * 2;
		}
		let xMin = Math.min(Math.cos(startAngle), Math.cos(endAngle)) * radius;
		let xMax = Math.max(Math.cos(startAngle), Math.cos(endAngle)) * radius;
		let yMin = Math.min(Math.sin(startAngle), Math.sin(endAngle)) * radius;
		let yMax = Math.max(Math.sin(startAngle), Math.sin(endAngle)) * radius;
		for (let i = Math.ceil(startAngle / (PI * 0.5)); i <= endAngle / (PI * 0.5); i++) {
			switch (i % 4) {
				case 0:
					xMax = radius;
					break;
				case 1:
					yMax = radius;
					break;
				case 2:
					xMin = -radius;
					break;
				case 3:
					yMin = -radius;
					break;
			}
		}
		this.extendBoundsByPoint(Math.floor(xMin) + x, Math.floor(yMin) + y);
		this.extendBoundsByPoint(Math.ceil(xMax) + x, Math.ceil(yMax) + y);
	}
}
