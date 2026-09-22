import { WebGLRenderTarget } from './WebGLRenderTarget.js';
import type { GL } from './WebGLUtils.js';

const COUNT_LIMIT = 16;
const BYTE_LIMIT = 64 * 1024 * 1024;

/**
 * Bounded context-owned pool. Active targets are owned by the filter execution.
 */
export class WebGLFilterTargetPool {
	private readonly _targets = new Map<string, WebGLRenderTarget[]>();
	private _size = 0;
	private _bytes = 0;

	public constructor(private readonly _gl: GL) {}

	public get size(): number {
		return this._size;
	}
	public get bytes(): number {
		return this._bytes;
	}

	public acquire(width: number, height: number): WebGLRenderTarget {
		const key = `${width}x${height}`;
		const bucket = this._targets.get(key);
		const target = bucket?.pop();
		if (target) {
			this._size--;
			this._bytes -= width * height * 4;
			if (!bucket!.length) {
				this._targets.delete(key);
			}
			return target;
		}
		const result = new WebGLRenderTarget(this._gl, width, height);
		try {
			result.initFrameBuffer();
			if (this._gl.checkFramebufferStatus(this._gl.FRAMEBUFFER) !== this._gl.FRAMEBUFFER_COMPLETE) {
				throw new Error(`Cannot allocate filter framebuffer ${width}x${height}.`);
			}
			return result;
		} catch (error) {
			result.dispose();
			throw error;
		}
	}

	public release(target: WebGLRenderTarget): void {
		const bytes = target.width * target.height * 4;
		if (bytes > BYTE_LIMIT) {
			target.dispose();
			return;
		}
		while (this._size >= COUNT_LIMIT || this._bytes + bytes > BYTE_LIMIT) {
			const oldest = this._targets.entries().next().value;
			if (!oldest) break;
			const [key, bucket] = oldest;
			const removed = bucket.pop()!;
			this._size--;
			this._bytes -= removed.width * removed.height * 4;
			removed.dispose();
			if (!bucket.length) {
				this._targets.delete(key);
			}
		}
		const key = `${target.width}x${target.height}`;
		const bucket = this._targets.get(key) ?? [];
		bucket.push(target);
		this._targets.set(key, bucket);
		this._size++;
		this._bytes += bytes;
	}

	public clear(contextLost = false): void {
		if (!contextLost) {
			for (const bucket of this._targets.values()) {
				for (const target of bucket) {
					target.dispose();
				}
			}
		}
		this._targets.clear();
		this._size = this._bytes = 0;
	}
}
