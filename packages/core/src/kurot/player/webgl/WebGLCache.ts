import type { DisplayList } from '../canvas/DisplayList.js';
import { WebGLRenderBuffer } from './WebGLRenderBuffer.js';
import type { WebGLRenderContext } from './WebGLRenderContext.js';

// The held buffer has no reference to its display-tree owner.
const cacheGC = new FinalizationRegistry<WebGLRenderBuffer>(buffer => {
	buffer.rootRenderTarget.dispose();
});

/**
 * Persistent GPU surface owned by one DisplayList and one renderer context.
 * Unlike scratch effect buffers it is never returned to a shared pool.
 */
export class WebGLCache {
	public buffer?: WebGLRenderBuffer;
	public valid = false;
	private _contextVersion: number;
	private _offsetX = 0;
	private _offsetY = 0;
	private readonly _unregister: () => void;

	public constructor(public readonly context: WebGLRenderContext) {
		this._contextVersion = context.contextVersion;
		this._unregister = context.$registerCache(this);
	}

	public prepare(displayList: DisplayList, inheritedResolution: number): WebGLRenderBuffer | undefined {
		if (!displayList.$updateGeometry(this.context.maxTextureSize, inheritedResolution, true)) {
			this._releaseSurface();
			return undefined;
		}
		const { $width: width, $height: height, actualResolution: resolution } = displayList;
		if (this._contextVersion !== this.context.contextVersion) {
			this.buffer?.rootRenderTarget.handleContextRestored();
			this._contextVersion = this.context.contextVersion;
			this.valid = false;
		}
		if (!this.buffer) {
			this.context.flush();
			this.buffer = new WebGLRenderBuffer(this.context, width, height);
			cacheGC.register(this, this.buffer, this);
		}
		const buffer = this.buffer;
		buffer.rootRenderTarget.initFrameBuffer();
		if (buffer.width !== width || buffer.height !== height) {
			buffer.resize(width, height);
			this.valid = false;
		}
		if (buffer.resolution !== resolution || this._offsetX !== displayList.offsetX || this._offsetY !== displayList.offsetY) {
			buffer.resolution = resolution;
			this._offsetX = displayList.offsetX;
			this._offsetY = displayList.offsetY;
			this.valid = false;
		}
		return buffer;
	}

	public dispose(): void {
		this.context.flush();
		this._releaseSurface();
		this._unregister();
	}

	private _releaseSurface(): void {
		cacheGC.unregister(this);
		this.buffer?.rootRenderTarget.dispose();
		this.buffer = undefined;
		this.valid = false;
	}
}
