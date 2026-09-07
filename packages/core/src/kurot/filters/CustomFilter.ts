import { Filter } from './Filter.js';
import type { FilterTexture } from './FilterTexture.js';

/**
 * Numeric uniforms are checked against the linked GLSL type and array length.
 * Matrices use column-major order; booleans may be boolean or 0/1.
 */
export type CustomFilterUniform = number | boolean | readonly number[] | Float32Array | Int32Array;

export interface FilterProgramSource {
	/**
	 * Omit to use the backend's standard filter vertex shader.
	 */
	vertex?: string;
	fragment: string;
}

export interface CustomFilterOptions {
	/**
	 * GLSL ES 1.00 program. Missing backend programs throw when rendered.
	 */
	webgl1?: FilterProgramSource;
	/**
	 * GLSL ES 3.00 program, including its #version directive.
	 */
	webgl2?: FilterProgramSource;
	uniforms?: Record<string, CustomFilterUniform>;
	textures?: Record<string, FilterTexture>;
	/**
	 * Extra transparent border in logical pixels on each side.
	 */
	padding?: number;
}

/**
 * A single-input GPU filter. Sources are compiled verbatim, without GLSL translation.
 * Use from() for explicit backend variants and an optional default vertex shader.
 */
export class CustomFilter extends Filter {
	public static from(options: CustomFilterOptions): CustomFilter {
		const first = options.webgl1 ?? options.webgl2;
		if (!first) throw new Error('CustomFilter requires at least one backend program.');
		const filter = new CustomFilter(first.vertex ?? '', first.fragment, options.uniforms);
		filter._programs = {
			webgl1: options.webgl1 ? { ...options.webgl1 } : undefined,
			webgl2: options.webgl2 ? { ...options.webgl2 } : undefined,
		};
		filter.padding = options.padding ?? 0;
		for (const [name, texture] of Object.entries(options.textures ?? {})) {
			filter.setTexture(name, texture);
		}
		return filter;
	}

	// ── Instance fields ────────────────────────────────────────────────────

	public readonly vertexSrc: string;
	public readonly fragmentSrc: string;
	public readonly shaderKey: string;
	public readonly textures: Record<string, FilterTexture> = {};
	private _programs?: Pick<CustomFilterOptions, 'webgl1' | 'webgl2'>;
	private _padding = 0;

	/**
	 * Uses this exact source pair on either WebGL backend. Uniform values must
	 * match linked GLSL types. An empty vertex source selects the standard vertex.
	 */
	public constructor(vertexSrc: string, fragmentSrc: string, uniforms: Record<string, CustomFilterUniform> = {}) {
		super();
		this.type = 'custom';
		this.vertexSrc = vertexSrc;
		this.fragmentSrc = fragmentSrc;
		this.shaderKey = JSON.stringify([vertexSrc, fragmentSrc]);
		this.uniforms = { ...uniforms };
	}

	// ── Getters / Setters ───────────────────────────────────────────────────

	public get padding(): number {
		return this._padding;
	}
	public set padding(value: number) {
		if (!Number.isFinite(value) || value < 0) throw new RangeError('Filter padding must be finite and non-negative.');
		if (this._padding === value) return;
		this._padding = value;
		this.onPropertyChange();
	}

	// ── Public methods ─────────────────────────────────────────────────────

	public setUniform(name: string, value: CustomFilterUniform): void {
		this.uniforms[name] = value;
		this.invalidate();
	}

	public setTexture(name: string, texture: FilterTexture | undefined): void {
		if (['uSampler', 'projectionVector', 'uTextureSize', 'uInputSize', 'uInputClamp', 'uResolution', 'uOutputSize'].includes(name)) {
			throw new Error(`CustomFilter texture ${name} is reserved.`);
		}
		if (texture) {
			this.textures[name] = { ...texture };
		} else {
			delete this.textures[name];
		}
		this.invalidate();
	}

	public $getProgram(isWebGL2: boolean): FilterProgramSource {
		if (!this._programs) return { vertex: this.vertexSrc || undefined, fragment: this.fragmentSrc };
		const program = isWebGL2 ? this._programs.webgl2 : this._programs.webgl1;
		if (!program) throw new Error(`CustomFilter has no WebGL ${isWebGL2 ? '2' : '1'} program.`);
		return program;
	}

	protected override updatePadding(): void {
		this.paddingTop = this.paddingBottom = this.paddingLeft = this.paddingRight = this._padding;
	}
}
