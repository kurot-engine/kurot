import { Filter } from './Filter.js';
import type { DisplayObject } from '../display/DisplayObject.js';

/**
 * 'original' is this effect's input; numbers refer to earlier pass outputs.
 */
export type FilterPassInput = 'original' | number;

export interface FilterPass {
	filter: Filter;
	/**
	 * Defaults to the previous pass, or 'original' for the first pass.
	 */
	input?: FilterPassInput;
	/**
	 * Additional framebuffer inputs for a CustomFilter's sampler2D uniforms.
	 * These use bottom-left UVs; their automatic <name>Matrix is identity.
	 */
	textures?: Readonly<Record<string, FilterPassInput>>;
	/**
	 * Output resolution relative to this effect's resolution, in (0, 1].
	 * Each pass covers the same logical rectangle, regardless of resolution.
	 */
	scale?: number;
}

/**
 * An immutable acyclic sequence of 1–32 GPU passes. Intermediate images are
 * borrowed only within one render; the renderer owns and recycles them.
 * Nested MultiPassFilter instances are intentionally not supported.
 */
export class MultiPassFilter extends Filter {
	public readonly passes: readonly FilterPass[];

	public constructor(passes: readonly FilterPass[]) {
		super();
		if (passes.length < 1 || passes.length > 32) throw new RangeError('MultiPassFilter requires 1–32 passes.');
		this.type = 'multiPass';
		this.passes = Object.freeze(passes.map((pass, index) => {
			if (pass.filter instanceof MultiPassFilter) throw new Error('MultiPassFilter cannot contain another MultiPassFilter.');
			const input = pass.input ?? (index === 0 ? 'original' : index - 1);
			const scale = pass.scale ?? 1;
			if (!Number.isFinite(scale) || scale <= 0 || scale > 1) throw new RangeError('Filter pass scale must be in (0, 1].');
			for (const ref of [input, ...Object.values(pass.textures ?? {})]) {
				if (ref !== 'original' && (!Number.isInteger(ref) || ref < 0 || ref >= index)) {
					throw new Error('Filter pass inputs must refer to the original or an earlier pass.');
				}
			}
			return Object.freeze({ filter: pass.filter, input, scale, textures: Object.freeze({ ...pass.textures }) });
		}));
	}

	public override getPadding(): { left: number; right: number; top: number; bottom: number } {
		const padding = { left: 0, right: 0, top: 0, bottom: 0 };
		for (const pass of this.passes) {
			const next = pass.filter.getPadding();
			padding.left += next.left;
			padding.right += next.right;
			padding.top += next.top;
			padding.bottom += next.bottom;
		}
		return padding;
	}

	public override $attach(target: DisplayObject): void {
		super.$attach(target);
		for (const pass of this.passes) { pass.filter.$attach(target); }
	}

	public override $detach(target: DisplayObject): void {
		super.$detach(target);
		for (const pass of this.passes) { pass.filter.$detach(target); }
	}
}
