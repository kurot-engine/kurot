import type { Filter } from '../../filters/Filter.js';
import { BlurFilter } from '../../filters/BlurFilter.js';
import { CustomFilter } from '../../filters/CustomFilter.js';
import { MultiPassFilter } from '../../filters/MultiPassFilter.js';
import type { WebGLRenderContext } from './WebGLRenderContext.js';
import type { WebGLRenderTarget } from './WebGLRenderTarget.js';
import { WebGLFilterTargetPool } from './WebGLFilterTargetPool.js';

/**
 * Borrowed framebuffer sampler; valid only during the current effect execution.
 */
export interface FilterSampler {
	texture: WebGLTexture;
	width: number;
	height: number;
}

/**
 * Executes GPU effects while keeping pass inputs alive until their last consumer.
 */
export class WebGLFilterSystem {
	public readonly pool: WebGLFilterTargetPool;
	private readonly _owned = new Set<WebGLRenderTarget>();

	public constructor(private readonly _context: WebGLRenderContext) {
		this.pool = new WebGLFilterTargetPool(_context.gl);
	}

	public render(filters: readonly Filter[], input: WebGLRenderTarget, resolution: number,
		composite: (output: WebGLRenderTarget) => void): void {
		const logicalWidth = input.width / resolution;
		const logicalHeight = input.height / resolution;
		let source = input;
		try {
			for (const filter of filters) {
				const output = this.apply(filter, source, logicalWidth, logicalHeight, resolution);
				if (output !== source) { this.release(source); }
				source = output;
			}
			composite(source);
		} finally {
			for (const target of this._owned) { this.pool.release(target); }
			this._owned.clear();
		}
	}

	private acquire(width: number, height: number): WebGLRenderTarget {
		const target = this.pool.acquire(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
		this._owned.add(target);
		return target;
	}

	private release(target: WebGLRenderTarget): void {
		if (this._owned.delete(target)) { this.pool.release(target); }
	}

	private apply(filter: Filter, input: WebGLRenderTarget, width: number, height: number, resolution: number,
		textures: Record<string, FilterSampler> = {}): WebGLRenderTarget {
		resolution = Math.min(resolution, filter.resolution ?? resolution);
		if (filter instanceof MultiPassFilter) {
			const outputs: WebGLRenderTarget[] = [];
			const uses = new Array<number>(filter.passes.length).fill(0);
			uses[uses.length - 1]++;
			for (const pass of filter.passes) {
				for (const ref of [pass.input!, ...Object.values(pass.textures ?? {})]) {
					if (ref !== 'original') { uses[ref]++; }
				}
			}
			for (const [index, pass] of filter.passes.entries()) {
				const source = pass.input === 'original' ? input : outputs[pass.input!];
				const samplers: Record<string, FilterSampler> = {};
				for (const [name, ref] of Object.entries(pass.textures ?? {})) {
					const target = ref === 'original' ? input : outputs[ref];
					samplers[name] = { texture: target.texture!, width: target.width, height: target.height };
				}
				outputs.push(this.apply(pass.filter, source, width, height, resolution * pass.scale!, samplers));
				for (const ref of [pass.input!, ...Object.values(pass.textures ?? {})]) {
					if (ref !== 'original' && --uses[ref] === 0) { this.release(outputs[ref]); }
				}
				if (uses[index] === 0) { this.release(outputs[index]); }
			}
			return outputs[outputs.length - 1];
		}
		if (Object.keys(textures).length && !(filter instanceof CustomFilter)) {
			throw new Error('Additional pass inputs require a CustomFilter.');
		}
		if (filter instanceof BlurFilter && (filter.blurX > 0 || filter.blurY > 0)) {
			return this.blur(filter, input, width, height, resolution);
		}
		const output = this.acquire(width * resolution, height * resolution);
		this._context.$drawFilterPass(filter instanceof BlurFilter ? undefined : filter, input, output, resolution, textures);
		return output;
	}

	private blur(filter: BlurFilter, input: WebGLRenderTarget, width: number, height: number, resolution: number): WebGLRenderTarget {
		const divisor = Math.sqrt(filter.quality);
		const factor = Math.min(1, 32 * divisor / (Math.max(filter.blurX, filter.blurY) * resolution));
		const w = Math.max(1, Math.floor(width * resolution * factor));
		const h = Math.max(1, Math.floor(height * resolution * factor));
		let source = input;
		if (source.width !== w || source.height !== h) {
			source = this.acquire(w, h);
			this._context.$drawFilterPass(undefined, input, source, resolution * factor);
		}
		for (let pass = 0; pass < filter.quality; pass++) {
			const horizontal = this.acquire(w, h);
			const vertical = this.acquire(w, h);
			this._context.$drawBlurPass(true, source, horizontal, filter.blurX * w / width / divisor);
			this._context.$drawBlurPass(false, horizontal, vertical, filter.blurY * h / height / divisor);
			this.release(horizontal);
			if (source !== input) { this.release(source); }
			source = vertical;
		}
		if (source.width !== Math.max(1, Math.round(width * resolution)) || source.height !== Math.max(1, Math.round(height * resolution))) {
			const fullSize = this.acquire(width * resolution, height * resolution);
			this._context.$drawFilterPass(undefined, source, fullSize, resolution);
			this.release(source);
			source = fullSize;
		}
		return source;
	}
}
