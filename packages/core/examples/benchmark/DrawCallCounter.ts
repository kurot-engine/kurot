interface MutableWebGLContext extends WebGLRenderingContext {
	drawArrays: WebGLRenderingContext['drawArrays'];
	drawElements: WebGLRenderingContext['drawElements'];
}

/** Counts actual WebGL draw submissions made through a canvas context. */
export class DrawCallCounter {
	private _count = 0;
	private _context?: MutableWebGLContext;
	private _drawArrays?: WebGLRenderingContext['drawArrays'];
	private _drawElements?: WebGLRenderingContext['drawElements'];

	public attach(canvas: HTMLCanvasElement): void {
		this.detach();
		const context = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as MutableWebGLContext | null;
		if (!context) {
			throw new Error('Cannot count draw calls without a WebGL context.');
		}
		this._context = context;
		this._drawArrays = context.drawArrays;
		this._drawElements = context.drawElements;
		context.drawArrays = (...args): void => {
			this._count++;
			this._drawArrays?.apply(context, args);
		};
		context.drawElements = (...args): void => {
			this._count++;
			this._drawElements?.apply(context, args);
		};
	}

	public reset(): void {
		this._count = 0;
	}

	public read(): number {
		return this._count;
	}

	public detach(): void {
		if (this._context && this._drawArrays && this._drawElements) {
			this._context.drawArrays = this._drawArrays;
			this._context.drawElements = this._drawElements;
		}
		this._context = undefined;
		this._drawArrays = undefined;
		this._drawElements = undefined;
		this._count = 0;
	}
}
