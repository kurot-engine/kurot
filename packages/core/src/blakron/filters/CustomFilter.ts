import { Filter } from './Filter.js';

const sourceKeyMap = new Map<string, string>();

function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
		const r = (Math.random() * 16) | 0;
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
	});
}

export class CustomFilter extends Filter {
	// ── Instance fields ───────────────────────────────────────────────────────

	public readonly vertexSrc: string;
	public readonly fragmentSrc: string;
	public readonly shaderKey: string;

	private _padding = 0;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(vertexSrc: string, fragmentSrc: string, uniforms: Record<string, unknown> = {}) {
		super();
		this.type = 'custom';
		this.vertexSrc = vertexSrc;
		this.fragmentSrc = fragmentSrc;
		const tempKey = vertexSrc + fragmentSrc;
		if (!sourceKeyMap.has(tempKey)) sourceKeyMap.set(tempKey, generateUUID());
		this.shaderKey = sourceKeyMap.get(tempKey)!;
		this.uniforms = uniforms;
		this.onPropertyChange();
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get padding(): number {
		return this._padding;
	}
	public set padding(value: number) {
		if (this._padding === value) return;
		this._padding = value;
		this.onPropertyChange();
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	protected override updatePadding(): void {
		this.paddingTop = this.paddingBottom = this.paddingLeft = this.paddingRight = this._padding;
	}
}
