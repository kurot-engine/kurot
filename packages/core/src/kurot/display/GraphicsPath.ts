import { Matrix } from '../geom/Matrix.js';

/**
 * Discriminants for Graphics' retained command stream. Geometry coordinates and
 * lengths use local logical units; arc angles use radians.
 */
export const enum PathCommandType {
	MoveTo = 0,
	LineTo = 1,
	CurveTo = 2,
	CubicCurveTo = 3,
	DrawRect = 4,
	DrawRoundRect = 5,
	DrawCircle = 6,
	DrawEllipse = 7,
	DrawArc = 8,
	BeginFill = 9,
	BeginGradientFill = 10,
	EndFill = 11,
	LineStyle = 12,
	Clear = 13,
}

/**
 * Moves the current path position without adding a segment.
 */
export interface MoveToCommand {
	type: PathCommandType.MoveTo;
	x: number;
	y: number;
}

/**
 * Adds a straight segment from the current position to (x, y).
 */
export interface LineToCommand {
	type: PathCommandType.LineTo;
	x: number;
	y: number;
}

/**
 * Quadratic segment: (cx, cy) is the control point and (ax, ay) the endpoint.
 */
export interface CurveToCommand {
	type: PathCommandType.CurveTo;
	cx: number;
	cy: number;
	ax: number;
	ay: number;
}

/**
 * Cubic segment with two control points and endpoint (ax, ay).
 */
export interface CubicCurveToCommand {
	type: PathCommandType.CubicCurveTo;
	cx1: number;
	cy1: number;
	cx2: number;
	cy2: number;
	ax: number;
	ay: number;
}

/**
 * Rectangle with top-left origin and logical width/height w/h.
 */
export interface DrawRectCommand {
	type: PathCommandType.DrawRect;
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Rounded rectangle; ew/eh are corner ellipse diameters, not radii.
 */
export interface DrawRoundRectCommand {
	type: PathCommandType.DrawRoundRect;
	x: number;
	y: number;
	w: number;
	h: number;
	ew: number;
	eh: number;
}

/**
 * Circle centered at (x, y) with logical radius r.
 */
export interface DrawCircleCommand {
	type: PathCommandType.DrawCircle;
	x: number;
	y: number;
	r: number;
}

/**
 * Ellipse inscribed in the rectangle (x, y, w, h), not centered at (x, y).
 */
export interface DrawEllipseCommand {
	type: PathCommandType.DrawEllipse;
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Circular arc centered at (x, y). start/end are radians; ccw selects the
 * counterclockwise direction in Canvas coordinates.
 */
export interface DrawArcCommand {
	type: PathCommandType.DrawArc;
	x: number;
	y: number;
	r: number;
	start: number;
	end: number;
	ccw: boolean;
}

/**
 * Solid fill state for subsequent paths: RGB color and alpha in [0, 1].
 */
export interface BeginFillCommand {
	type: PathCommandType.BeginFill;
	color: number;
	alpha: number;
}

/**
 * Linear or radial fill state. Colors, alphas, ratios and matrix are borrowed
 * from the drawing call; do not mutate them behind the raster cache.
 */
export interface BeginGradientFillCommand {
	type: PathCommandType.BeginGradientFill;
	gradientType: string;
	colors: number[];
	alphas: number[];
	/**
	 * Gradient stop positions in [0, 255], paired with colors and alphas.
	 */
	ratios: number[];
	/**
	 * Optional gradient-space transform; undefined uses the renderer's default.
	 */
	matrix: Matrix | undefined;
}

/**
 * Completes the current fill without removing earlier geometry.
 */
export interface EndFillCommand {
	type: PathCommandType.EndFill;
}

/**
 * Stroke state for subsequent geometry. Thickness and dash lengths are logical
 * units; alpha is in [0, 1] and color is RGB.
 */
export interface LineStyleCommand {
	type: PathCommandType.LineStyle;
	thickness: number;
	color: number;
	alpha: number;
	/**
	 * Cap style, with undefined selecting 'none' (Canvas 'butt').
	 */
	caps: string | undefined;
	/**
	 * Join style, with undefined selecting 'round'.
	 */
	joints: string | undefined;
	/**
	 * Maximum miter length as a multiple of stroke thickness.
	 */
	miterLimit: number;
	/**
	 * Borrowed dash/gap lengths; undefined leaves the Canvas dash state unchanged.
	 */
	lineDash: number[] | undefined;
}

/**
 * Disables fill/stroke state during replay; it does not erase earlier pixels.
 * Graphics.clear() instead empties the retained array and resets its raster surface.
 */
export interface ClearCommand {
	type: PathCommandType.Clear;
}

/**
 * Ordered fill, stroke and geometry records, discriminated by type. Commands
 * are retained data for replay, separate from the display-node hierarchy.
 */
export type GraphicsCommand =
	| MoveToCommand
	| LineToCommand
	| CurveToCommand
	| CubicCurveToCommand
	| DrawRectCommand
	| DrawRoundRectCommand
	| DrawCircleCommand
	| DrawEllipseCommand
	| DrawArcCommand
	| BeginFillCommand
	| BeginGradientFillCommand
	| EndFillCommand
	| LineStyleCommand
	| ClearCommand;
