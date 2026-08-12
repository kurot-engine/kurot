import { Matrix } from '../../geom/Matrix.js';
import { Rectangle } from '../../geom/Rectangle.js';
import { WebGLRenderTarget } from './WebGLRenderTarget.js';
import { WebGLRenderContext } from './WebGLRenderContext.js';

const _pool: WebGLRenderBuffer[] = [];

export class WebGLRenderBuffer {
	// ── Static fields ─────────────────────────────────────────────────────────

	public static create(context: WebGLRenderContext, width: number, height: number): WebGLRenderBuffer {
		let buf: WebGLRenderBuffer | undefined;
		for (let i = _pool.length - 1; i >= 0; i--) {
			if (_pool[i].context === context) {
				buf = _pool[i];
				_pool.splice(i, 1);
				break;
			}
		}
		if (buf) {
			buf.resize(width, height);
			buf._resetState();
			return buf;
		}
		return new WebGLRenderBuffer(context, width, height, false);
	}

	public static release(buf: WebGLRenderBuffer): void {
		buf.filterPadX = 0;
		buf.filterPadY = 0;
		buf.hasOffscreenTransform = false;
		if (_pool.length < 6) {
			_pool.push(buf);
		} else {
			buf.context.flush();
			buf.rootRenderTarget.dispose();
		}
	}

	// ── Public readonly fields ────────────────────────────────────────────────

	public readonly context: WebGLRenderContext;
	public readonly rootRenderTarget: WebGLRenderTarget;
	public readonly isRoot: boolean;

	// ── Public mutable fields ─────────────────────────────────────────────────

	public globalAlpha = 1;
	public globalTintColor = 0xffffff;
	public globalMatrix: Matrix = new Matrix();
	public savedGlobalMatrix: Matrix = new Matrix();
	public offsetX = 0;
	public offsetY = 0;
	public currentTexture?: WebGLTexture;
	public drawCalls = 0;

	public offscreenOriginX = 0;
	public offscreenOriginY = 0;
	// Whether instructions must be converted from world space into this offscreen buffer's local space.
	public hasOffscreenTransform = false;
	// Inverse world transform of the object that owns this offscreen buffer.
	public readonly offscreenInverseTransform: Matrix = new Matrix();
	// Local translation that places content bounds after any filter padding.
	public offscreenLocalX = 0;
	public offscreenLocalY = 0;
	public filterPadX = 0;
	public filterPadY = 0;

	// Stencil
	public stencilList: { x: number; y: number; width: number; height: number }[] = [];
	public stencilHandleCount = 0;

	// Scissor
	public scissorState = false;
	public hasScissor = false;

	// ── Private fields ────────────────────────────────────────────────────────

	private _stencilState = false;
	private readonly _scissorRect: Rectangle = new Rectangle();

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(context: WebGLRenderContext, width?: number, height?: number, isRoot = false) {
		this.context = context;
		this.isRoot = isRoot;
		this.rootRenderTarget = new WebGLRenderTarget(context.gl, width ?? 3, height ?? 3);

		if (isRoot) {
			context.pushBuffer(this);
		} else {
			const last = context.activatedBuffer;
			if (last) {
				last.rootRenderTarget.activate();
			}
			this.rootRenderTarget.initFrameBuffer();
		}

		if (width && height) {
			this.resize(width, height);
		}
	}

	// ── Getters ───────────────────────────────────────────────────────────────

	public get width(): number {
		return this.rootRenderTarget.width;
	}

	public get height(): number {
		return this.rootRenderTarget.height;
	}

	// ── Lifecycle ─────────────────────────────────────────────────────────────

	public resize(width: number, height: number): void {
		width = Math.max(width, 1);
		height = Math.max(height, 1);
		this.context.pushBuffer(this);
		if (width !== this.rootRenderTarget.width || height !== this.rootRenderTarget.height) {
			this.context.drawCmdManager.pushResize(this, width, height);
			this.rootRenderTarget.width = width;
			this.rootRenderTarget.height = height;
		}
		if (this.isRoot) {
			this.context.resize(width, height);
		}
		this.context.clear();
		this.context.popBuffer();
	}

	public clear(): void {
		this.context.pushBuffer(this);
		this.context.clear();
		this.context.popBuffer();
	}

	public onRenderFinish(): void {
		this.drawCalls = 0;
	}

	public getPixels(x: number, y: number, width = 1, height = 1): number[] {
		const pixels = new Uint8Array(4 * width * height);
		const useFrameBuffer = this.rootRenderTarget.useFrameBuffer;
		this.rootRenderTarget.useFrameBuffer = true;
		this.rootRenderTarget.activate();
		this.context.getPixels(x, this.height - y - height, width, height, pixels);
		this.rootRenderTarget.useFrameBuffer = useFrameBuffer;
		this.rootRenderTarget.activate();

		// Flip vertically and un-premultiply alpha.
		const result = new Uint8Array(4 * width * height);
		for (let i = 0; i < height; i++) {
			for (let j = 0; j < width; j++) {
				const src = (width * i + j) * 4;
				const dst = (width * (height - i - 1) + j) * 4;
				const a = pixels[src + 3];
				result[dst] = a ? Math.round((pixels[src] / a) * 255) : 0;
				result[dst + 1] = a ? Math.round((pixels[src + 1] / a) * 255) : 0;
				result[dst + 2] = a ? Math.round((pixels[src + 2] / a) * 255) : 0;
				result[dst + 3] = a;
			}
		}
		return Array.from(result);
	}

	// ── Transform ─────────────────────────────────────────────────────────────

	public setTransform(a: number, b: number, c: number, d: number, tx: number, ty: number): void {
		const m = this.globalMatrix;
		m.a = a;
		m.b = b;
		m.c = c;
		m.d = d;
		m.tx = tx;
		m.ty = ty;
	}

	public transform(a: number, b: number, c: number, d: number, tx: number, ty: number): void {
		const m = this.globalMatrix;
		const a1 = m.a,
			b1 = m.b,
			c1 = m.c,
			d1 = m.d;
		if (a !== 1 || b !== 0 || c !== 0 || d !== 1) {
			m.a = a * a1 + b * c1;
			m.b = a * b1 + b * d1;
			m.c = c * a1 + d * c1;
			m.d = c * b1 + d * d1;
		}
		m.tx = tx * a1 + ty * c1 + m.tx;
		m.ty = tx * b1 + ty * d1 + m.ty;
	}

	public useOffset(): void {
		if (this.offsetX !== 0 || this.offsetY !== 0) {
			this.globalMatrix.append(1, 0, 0, 1, this.offsetX, this.offsetY);
			this.offsetX = this.offsetY = 0;
		}
	}

	private _resetState(): void {
		this.globalAlpha = 1;
		this.globalTintColor = 0xffffff;
		this.globalMatrix.identity();
		this.savedGlobalMatrix.identity();
		this.offsetX = 0;
		this.offsetY = 0;
		this.currentTexture = undefined;
		this.drawCalls = 0;

		this.offscreenOriginX = 0;
		this.offscreenOriginY = 0;
		this.hasOffscreenTransform = false;
		this.offscreenInverseTransform.identity();
		this.offscreenLocalX = 0;
		this.offscreenLocalY = 0;
		this.filterPadX = 0;
		this.filterPadY = 0;

		this.stencilList.length = 0;
		this.stencilHandleCount = 0;
		this.scissorState = false;
		this.hasScissor = false;
		this._stencilState = false;
		this._scissorRect.setEmpty();
	}

	public saveTransform(): void {
		const m = this.globalMatrix,
			s = this.savedGlobalMatrix;
		s.a = m.a;
		s.b = m.b;
		s.c = m.c;
		s.d = m.d;
		s.tx = m.tx;
		s.ty = m.ty;
	}

	public restoreTransform(): void {
		const m = this.globalMatrix,
			s = this.savedGlobalMatrix;
		m.a = s.a;
		m.b = s.b;
		m.c = s.c;
		m.d = s.d;
		m.tx = s.tx;
		m.ty = s.ty;
	}

	// ── Stencil ───────────────────────────────────────────────────────────────

	public enableStencil(): void {
		if (!this._stencilState) {
			this.context.enableStencilTest();
			this._stencilState = true;
		}
	}

	public disableStencil(): void {
		if (this._stencilState) {
			this.context.disableStencilTest();
			this._stencilState = false;
		}
	}

	public restoreStencil(): void {
		if (this._stencilState) this.context.enableStencilTest();
		else this.context.disableStencilTest();
	}

	// ── Scissor ───────────────────────────────────────────────────────────────

	public enableScissor(x: number, y: number, width: number, height: number): void {
		if (!this.scissorState) {
			this.scissorState = true;
			this._scissorRect.setTo(x, y, width, height);
			this.context.enableScissorTest(this._scissorRect);
		}
	}

	public disableScissor(): void {
		if (this.scissorState) {
			this.scissorState = false;
			this._scissorRect.setEmpty();
			this.context.disableScissorTest();
		}
	}

	public restoreScissor(): void {
		if (this.scissorState) {
			this.context.enableScissorTest(this._scissorRect);
		} else {
			this.context.disableScissorTest();
		}
	}
}
