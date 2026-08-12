import type { GL } from './WebGLUtils.js';

export class WebGLRenderTarget {
	// ── Public fields ─────────────────────────────────────────────────────────

	public texture?: WebGLTexture;
	public width: number;
	public height: number;
	public useFrameBuffer = true;
	public clearColor: [number, number, number, number] = [0, 0, 0, 0];

	// ── Private fields ────────────────────────────────────────────────────────

	private readonly _gl: GL;
	private _frameBuffer?: WebGLFramebuffer;
	private _stencilBuffer?: WebGLRenderbuffer;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(gl: GL, width: number, height: number) {
		this._gl = gl;
		this.width = Math.max(width, 1);
		this.height = Math.max(height, 1);
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public resize(width: number, height: number): void {
		this.width = Math.max(width, 1);
		this.height = Math.max(height, 1);
		const gl = this._gl;
		if (this._frameBuffer && this.texture) {
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		}
		if (this._stencilBuffer) {
			gl.deleteRenderbuffer(this._stencilBuffer);
			this._stencilBuffer = undefined;
		}
	}

	public activate(): void {
		this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this.useFrameBuffer ? (this._frameBuffer ?? null) : null);
	}

	public initFrameBuffer(): void {
		if (this._frameBuffer) return;
		const gl = this._gl;
		this.texture = this._createTexture();
		this._frameBuffer = gl.createFramebuffer()!;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture!, 0);
	}

	public enabledStencil(): void {
		if (!this._frameBuffer || this._stencilBuffer) return;
		const gl = this._gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);
		this._stencilBuffer = gl.createRenderbuffer()!;
		gl.bindRenderbuffer(gl.RENDERBUFFER, this._stencilBuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, this.width, this.height);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this._stencilBuffer);
	}

	public clear(bind = false): void {
		const gl = this._gl;
		if (bind) this.activate();
		gl.colorMask(true, true, true, true);
		gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	public dispose(): void {
		const gl = this._gl;
		if (this.texture) {
			gl.deleteTexture(this.texture);
			this.texture = undefined;
		}
		if (this._frameBuffer) {
			gl.deleteFramebuffer(this._frameBuffer);
			this._frameBuffer = undefined;
		}
		if (this._stencilBuffer) {
			gl.deleteRenderbuffer(this._stencilBuffer);
			this._stencilBuffer = undefined;
		}
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _createTexture(): WebGLTexture {
		const gl = this._gl;
		const texture = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return texture;
	}
}
