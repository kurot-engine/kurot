import { BlurFilter } from './BlurFilter.js';
import { CustomFilter } from './CustomFilter.js';
import { MultiPassFilter } from './MultiPassFilter.js';
import { BloomShaders } from './BloomShaders.js';

export interface BloomFilterOptions {
	/**
	 * Brightness threshold in [0, 1], default 0.7. A value of 1 excludes all pixels.
	 */
	threshold?: number;
	/**
	 * Non-negative bloom contribution, default 1. This is an LDR effect.
	 */
	intensity?: number;
	/**
	 * Blur radius in logical pixels, default 8.
	 */
	blur?: number;
	quality?: number;
	/**
	 * Relative resolution of extraction and blur in (0, 1], default 0.5.
	 * The original and final composite retain the effect's full resolution.
	 */
	blurScale?: number;
	resolution?: number;
}

/**
 * GPU-only brightness extraction, separable blur and original-image composition.
 */
export class BloomFilter extends MultiPassFilter {
	private readonly _extract: CustomFilter;
	private readonly _combine: CustomFilter;
	private readonly _blur: BlurFilter;

	public constructor(options: BloomFilterOptions = {}) {
		const threshold = validateThreshold(options.threshold ?? 0.7);
		const intensity = validateIntensity(options.intensity ?? 1);
		const extract = CustomFilter.from({
			webgl1: { fragment: BloomShaders.extract1 }, webgl2: { fragment: BloomShaders.extract2 },
			uniforms: { threshold },
		});
		const combine = CustomFilter.from({
			webgl1: { fragment: BloomShaders.combine1 }, webgl2: { fragment: BloomShaders.combine2 },
			uniforms: { intensity },
		});
		const blur = new BlurFilter(options.blur ?? 8, options.blur ?? 8, options.quality ?? 1);
		const scale = options.blurScale ?? 0.5;
		super([{ filter: extract, scale }, { filter: blur, scale },
			{ filter: combine, textures: { uOriginal: 'original' } }]);
		this._extract = extract;
		this._combine = combine;
		this._blur = blur;
		this.resolution = options.resolution;
	}

	public get threshold(): number { return this._extract.uniforms.threshold as number; }
	public set threshold(value: number) { this._extract.setUniform('threshold', validateThreshold(value)); }

	public get intensity(): number { return this._combine.uniforms.intensity as number; }
	public set intensity(value: number) { this._combine.setUniform('intensity', validateIntensity(value)); }

	public get blur(): number { return this._blur.blurX; }
	public set blur(value: number) { this._blur.blurX = value; this._blur.blurY = value; }

	public get quality(): number { return this._blur.quality; }
	public set quality(value: number) { this._blur.quality = value; }
}

function validateThreshold(value: number): number {
	if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Bloom threshold must be in [0, 1].');
	return value;
}

function validateIntensity(value: number): number {
	if (!Number.isFinite(value) || value < 0) throw new RangeError('Bloom intensity must be finite and non-negative.');
	return value;
}
