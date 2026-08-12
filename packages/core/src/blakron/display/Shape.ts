import { Rectangle } from '../geom/Rectangle.js';
import { DisplayObject, RenderObjectType } from './DisplayObject.js';
import { Graphics } from './Graphics.js';

export class Shape extends DisplayObject {
	// ── Instance fields ───────────────────────────────────────────────────────

	protected override _graphics: Graphics;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor() {
		super();
		this.$renderObjectType = RenderObjectType.SHAPE;
		this._graphics = new Graphics();
		this._graphics.targetDisplay = this;
	}

	// ── Getters ───────────────────────────────────────────────────────────────

	public override get graphics(): Graphics {
		return this._graphics;
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	override $measureContentBounds(bounds: Rectangle): void {
		this.graphics.$measureContentBounds(bounds);
	}

	override $hitTest(stageX: number, stageY: number): DisplayObject | undefined {
		const target = super.$hitTest(stageX, stageY);
		if (target !== this) return target;
		const m = this.$getInvertedConcatenatedMatrix();
		const localX = m.a * stageX + m.c * stageY + m.tx;
		const localY = m.b * stageX + m.d * stageY + m.ty;
		return this.graphics.$hitTest(localX, localY) ? this : undefined;
	}

	override $onRemoveFromStage(): void {
		super.$onRemoveFromStage();
		this.graphics.$onRemoveFromStage();
	}
}
