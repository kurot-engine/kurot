import type { DisplayObject } from '../display/DisplayObject.js';

export class Filter {
	// ── Instance fields ─────────────────────────────────────────────────────

	public type = '';

	uniforms: Record<string, unknown> = {};

	protected paddingTop = 0;
	protected paddingBottom = 0;
	protected paddingLeft = 0;
	protected paddingRight = 0;
	private readonly _targets = new Map<WeakRef<DisplayObject>, number>();
	private _resolution?: number;

	/**
	 * Physical pixels per logical unit for GPU effects. Undefined inherits the
	 * parent resolution; a chain uses the minimum requested resolution.
	 */
	public get resolution(): number | undefined { return this._resolution; }
	public set resolution(value: number | undefined) {
		if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
			throw new RangeError('Filter resolution must be finite and positive.');
		}
		if (this._resolution === value) return;
		this._resolution = value;
		this.invalidate();
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public onPropertyChange(): void {
		this.updatePadding();
		this.invalidate();
	}

	/**
	 * Invalidates users after directly editing uniforms or other mutable effect data.
	 */
	public invalidate(): void {
		for (const ref of this._targets.keys()) {
			const target = ref.deref();
			if (target) {
				target.$cacheDirty = true;
				target.$cacheDirtyUp();
				target.$markDirty();
			} else {
				this._targets.delete(ref);
			}
		}
	}

	public $attach(target: DisplayObject): void {
		for (const ref of this._targets.keys()) {
			if (ref.deref() === target) {
				this._targets.set(ref, this._targets.get(ref)! + 1);
				return;
			}
		}
		this._targets.set(new WeakRef(target), 1);
	}

	public $detach(target: DisplayObject): void {
		for (const ref of this._targets.keys()) {
			if (!ref.deref()) {
				this._targets.delete(ref);
			} else if (ref.deref() === target) {
				const remaining = this._targets.get(ref)! - 1;
				if (remaining > 0) { this._targets.set(ref, remaining); }
				else { this._targets.delete(ref); }
			}
		}
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	protected updatePadding(): void {}

	public getPadding(): { left: number; right: number; top: number; bottom: number } {
		return { left: this.paddingLeft, right: this.paddingRight, top: this.paddingTop, bottom: this.paddingBottom };
	}

	toJson(): string {
		return '';
	}
}
