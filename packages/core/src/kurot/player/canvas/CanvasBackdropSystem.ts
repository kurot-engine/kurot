import type { BackdropBlur } from '../../display/BackdropBlur.js';
import { backdropBounds, validateBackdrop } from '../backdrop.js';
import { CanvasBuffer } from './CanvasBuffer.js';

const MAX_DIMENSION = 4096;
const MAX_PIXELS = 4 * 1024 * 1024;

/**
 * Three reusable working canvases. Canvas blur is an approximation of the GPU
 * kernel; browsers without context.filter leave the destination untouched.
 */
export class CanvasBackdropSystem {
	// ── Instance fields ───────────────────────────────────────────────────

	private _sample?: CanvasBuffer;
	private _blurred?: CanvasBuffer;
	private _mixed?: CanvasBuffer;

	// ── Public methods ────────────────────────────────────────────────────

	public render(node: BackdropBlur, ctx: CanvasRenderingContext2D, x: number, y: number): number {
		validateBackdrop(node);
		if (!node.width || !node.height || !ctx.globalAlpha || (!node.blurX && !node.blurY) ||
			!('filter' in CanvasRenderingContext2D.prototype)) {
			return 0;
		}
		const m = ctx.getTransform().translate(x, y);
		if (Math.abs(m.a * m.d - m.b * m.c) < 1e-12) {
			return 0;
		}
		const pad = node.$getBackdropFilter().getPadding();
		const bounds = backdropBounds({ a: m.a, b: m.b, c: m.c, d: m.d, tx: m.e, ty: m.f },
			node.width, node.height, pad.left, pad.top);
		if (bounds.right <= 0 || bounds.bottom <= 0 || bounds.left >= ctx.canvas.width || bounds.top >= ctx.canvas.height) {
			return 0;
		}
		const width = node.width + 2 * pad.left;
		const height = node.height + 2 * pad.top;
		const resolution = Math.min(
			Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)),
			node.resolution ?? Infinity, MAX_DIMENSION / width, MAX_DIMENSION / height,
			Math.sqrt(MAX_PIXELS / width / height),
		);
		this._sample ??= new CanvasBuffer();
		this._blurred ??= new CanvasBuffer();
		this._mixed ??= new CanvasBuffer();
		const sample = prepare(this._sample, width * resolution, height * resolution);
		const blurred = prepare(this._blurred, width * resolution, height * resolution);
		const mixed = prepare(this._mixed, width * resolution, height * resolution);
		const inverse = m.inverse();
		sample.setTransform(inverse.a * resolution, inverse.b * resolution,
			inverse.c * resolution, inverse.d * resolution,
			(inverse.e + pad.left) * resolution, (inverse.f + pad.top) * resolution);
		drawClampedSource(sample, ctx.canvas, bounds);
		blurred.filter = `blur(${(node.blurX + node.blurY) / 2 * 0.25 * resolution}px)`;
		blurred.drawImage(this._sample.surface, 0, 0);
		blurred.filter = 'none';
		const opacity = Math.min(1, ctx.globalAlpha);
		mixed.globalAlpha = 1 - opacity;
		mixed.drawImage(this._sample.surface, 0, 0);
		mixed.globalAlpha = opacity;
		mixed.globalCompositeOperation = 'lighter';
		mixed.drawImage(this._blurred.surface, 0, 0);
		ctx.save();
		try {
			ctx.translate(x, y);
			ctx.beginPath();
			ctx.rect(0, 0, node.width, node.height);
			ctx.clip();
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = 'copy';
			ctx.filter = 'none';
			ctx.drawImage(this._mixed.surface, -pad.left, -pad.top, width, height);
		} finally {
			ctx.restore();
		}
		return 1;
	}

	public release(): void {
		this._sample?.destroy();
		this._blurred?.destroy();
		this._mixed?.destroy();
		this._sample = this._blurred = this._mixed = undefined;
	}
}

function prepare(buffer: CanvasBuffer, width: number, height: number): CanvasRenderingContext2D {
	if (buffer.width !== Math.ceil(width) || buffer.height !== Math.ceil(height)) {
		buffer.resize(width, height);
	}
	const ctx = buffer.context;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.filter = 'none';
	ctx.clearRect(0, 0, buffer.width, buffer.height);
	return ctx;
}

function drawClampedSource(
	ctx: CanvasRenderingContext2D,
	source: HTMLCanvasElement,
	bounds: { left: number; right: number; top: number; bottom: number },
): void {
	const w = source.width;
	const h = source.height;
	const columns = [[0, w, 0, w], [0, 1, bounds.left, -bounds.left], [w - 1, 1, w, bounds.right - w]];
	const rows = [[0, h, 0, h], [0, 1, bounds.top, -bounds.top], [h - 1, 1, h, bounds.bottom - h]];
	for (const [sx, sw, dx, dw] of columns) {
		for (const [sy, sh, dy, dh] of rows) {
			if (dw > 0 && dh > 0) {
				ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
			}
		}
	}
}
