export class Filter {
	// ── Instance fields ─────────────────────────────────────────────────────

	public type = '';

	uniforms: Record<string, unknown> = {};

	protected paddingTop = 0;
	protected paddingBottom = 0;
	protected paddingLeft = 0;
	protected paddingRight = 0;

	// ── Public methods ────────────────────────────────────────────────────────

	public onPropertyChange(): void {
		this.updatePadding();
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
