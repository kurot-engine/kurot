import type { BackdropBlur } from '../../display/BackdropBlur.js';
import { Matrix } from '../../geom/Matrix.js';
import { backdropBounds, validateBackdrop } from '../backdrop.js';
import type { WebGLRenderContext } from './WebGLRenderContext.js';
import type { WebGLRenderBuffer } from './WebGLRenderBuffer.js';
import type { WebGLRenderTarget } from './WebGLRenderTarget.js';
import type { WebGLFilterSystem } from './WebGLFilterSystem.js';
import { fitTextureResolution } from './WebGLUtils.js';
import { makeBackdropShader } from './backdrop-shaders.js';
import { captureBackdrop } from './backdrop-capture.js';

/**
 * Frame-local snapshots use the context's bounded effect pool. No node owns GPU
 * resources, and no previous-frame pixels or scene references are retained.
 */
export class WebGLBackdropSystem {
	// ── Instance fields ───────────────────────────────────────────────────

	private readonly _sample = makeBackdropShader(false);
	private readonly _composite = makeBackdropShader(true);

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(
		private readonly _context: WebGLRenderContext,
		private readonly _filters: WebGLFilterSystem,
	) {}

	// ── Public methods ────────────────────────────────────────────────────

	public render(node: BackdropBlur, parent: WebGLRenderBuffer): void {
		validateBackdrop(node);
		const filter = node.$getBackdropFilter();
		const m = parent.globalMatrix;
		const determinant = m.a * m.d - m.b * m.c;
		if (!node.width || !node.height || !parent.globalAlpha || (!node.blurX && !node.blurY) || Math.abs(determinant) < 1e-12) {
			return;
		}
		const pad = filter.getPadding();
		const bounds = backdropBounds(m, node.width, node.height, pad.left, pad.top);
		const left = Math.max(0, bounds.left);
		const top = Math.max(0, bounds.top);
		const right = Math.min(parent.width, bounds.right);
		const bottom = Math.min(parent.height, bounds.bottom);
		if (right <= left || bottom <= top) {
			return;
		}
		const width = node.width + pad.left * 2;
		const height = node.height + pad.top * 2;
		const requestedResolution = fitTextureResolution(width, height, Math.min(
			Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)),
			node.resolution ?? Infinity,
		), this._context.maxTextureSize);
		// Match BlurFilter's existing large-radius working density before capture,
		// avoiding a full-density local image and a later down/up-sample pair.
		const resolution = Math.min(requestedResolution,
			32 * Math.sqrt(node.quality) / Math.max(node.blurX, node.blurY));
		const context = this._context;
		context.flush();
		const gl = context.gl;
		const blend = gl.isEnabled(gl.BLEND);
		const stencil = gl.isEnabled(gl.STENCIL_TEST);
		const scissor = gl.isEnabled(gl.SCISSOR_TEST);
		const targets: WebGLRenderTarget[] = [];
		try {
			const local = this._filters.pool.acquire(Math.ceil(width * resolution), Math.ceil(height * resolution));
			targets.push(local);
			gl.disable(gl.BLEND);
			gl.disable(gl.STENCIL_TEST);
			gl.disable(gl.SCISSOR_TEST);
			const capture = captureBackdrop(context, this._filters.pool, parent, { left, top, right, bottom },
				resolution / Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)));
			const localArea = [pad.left, pad.top, width, height];
			Object.assign(this._sample.uniforms, {
				uRowX: [m.a, m.c, m.tx], uRowY: [m.b, m.d, m.ty],
				uCapture: capture.area, uLocal: localArea,
			});
			try {
				context.$drawFilterPass(this._sample, capture.source, local, resolution);
			} finally {
				if (!capture.borrowed) {
					this._filters.pool.release(capture.source);
				}
			}
			const inverse = new Matrix();
			m.invertInto(inverse);
			Object.assign(this._composite.uniforms, {
				uRowX: [inverse.a, inverse.c, inverse.tx], uRowY: [inverse.b, inverse.d, inverse.ty],
				uLocal: localArea, uHeight: parent.height,
			});
			const vertices = [
				m.tx, m.ty, m.a * node.width + m.tx, m.b * node.width + m.ty,
				m.a * node.width + m.c * node.height + m.tx, m.b * node.width + m.d * node.height + m.ty,
				m.c * node.height + m.tx, m.d * node.height + m.ty,
			];
			this._filters.render([filter], local, resolution, output => {
				parent.rootRenderTarget.activate();
				gl.viewport(0, 0, parent.width, parent.height);
				if (stencil) {
					gl.enable(gl.STENCIL_TEST);
				}
				if (scissor) {
					gl.enable(gl.SCISSOR_TEST);
				}
				if (parent.globalAlpha < 1) {
					gl.enable(gl.BLEND);
					gl.blendColor(0, 0, 0, parent.globalAlpha);
					gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);
				}
				context.$drawBackdropComposite(this._composite, output, parent, vertices);
			});
		} finally {
			for (const target of targets) {
				this._filters.pool.release(target);
			}
			parent.rootRenderTarget.activate();
			context.onResize(parent.width, parent.height);
			context.$restoreBackdropBlend();
			for (const [capability, enabled] of [[gl.BLEND, blend], [gl.STENCIL_TEST, stencil], [gl.SCISSOR_TEST, scissor]] as const) {
				if (enabled) {
					gl.enable(capability);
				} else {
					gl.disable(capability);
				}
			}
		}
	}
}
