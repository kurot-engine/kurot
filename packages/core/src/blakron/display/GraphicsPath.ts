import { Matrix } from '../geom/Matrix.js';

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

export interface MoveToCommand {
	type: PathCommandType.MoveTo;
	x: number;
	y: number;
}

export interface LineToCommand {
	type: PathCommandType.LineTo;
	x: number;
	y: number;
}

export interface CurveToCommand {
	type: PathCommandType.CurveTo;
	cx: number;
	cy: number;
	ax: number;
	ay: number;
}

export interface CubicCurveToCommand {
	type: PathCommandType.CubicCurveTo;
	cx1: number;
	cy1: number;
	cx2: number;
	cy2: number;
	ax: number;
	ay: number;
}

export interface DrawRectCommand {
	type: PathCommandType.DrawRect;
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface DrawRoundRectCommand {
	type: PathCommandType.DrawRoundRect;
	x: number;
	y: number;
	w: number;
	h: number;
	ew: number;
	eh: number;
}

export interface DrawCircleCommand {
	type: PathCommandType.DrawCircle;
	x: number;
	y: number;
	r: number;
}

export interface DrawEllipseCommand {
	type: PathCommandType.DrawEllipse;
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface DrawArcCommand {
	type: PathCommandType.DrawArc;
	x: number;
	y: number;
	r: number;
	start: number;
	end: number;
	ccw: boolean;
}

export interface BeginFillCommand {
	type: PathCommandType.BeginFill;
	color: number;
	alpha: number;
}

export interface BeginGradientFillCommand {
	type: PathCommandType.BeginGradientFill;
	gradientType: string;
	colors: number[];
	alphas: number[];
	ratios: number[];
	matrix: Matrix | undefined;
}

export interface EndFillCommand {
	type: PathCommandType.EndFill;
}

export interface LineStyleCommand {
	type: PathCommandType.LineStyle;
	thickness: number;
	color: number;
	alpha: number;
	caps: string | undefined;
	joints: string | undefined;
	miterLimit: number;
	lineDash: number[] | undefined;
}

export interface ClearCommand {
	type: PathCommandType.Clear;
}

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
