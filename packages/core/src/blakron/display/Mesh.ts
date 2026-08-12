import { Rectangle } from '../geom/Rectangle.js';
import { Bitmap } from './Bitmap.js';
import { RenderObjectType } from './DisplayObject.js';
import type { Texture } from './texture/Texture.js';

export class Mesh extends Bitmap {
	// ── Instance fields ───────────────────────────────────────────────────────

	/** Vertex positions: [x0, y0, x1, y1, ...] */
	public vertices: number[] = [];

	/** Triangle indices into the vertices array. */
	public indices: number[] = [];

	/** UV coordinates: [u0, v0, u1, v1, ...] */
	public uvs: number[] = [];

	private _verticesDirty = true;
	private _bounds: Rectangle = new Rectangle();

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(value?: Texture) {
		super(value);
		this.$renderObjectType = RenderObjectType.MESH;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Marks vertices as dirty and triggers a re-render.
	 * Call this after modifying `vertices`, `indices`, or `uvs`.
	 */
	public updateVertices(): void {
		this._verticesDirty = true;
		this.$renderDirty = true;
		this.$markDirty();
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	override $measureContentBounds(bounds: Rectangle): void {
		if (this._verticesDirty) {
			this._verticesDirty = false;
			if (this.vertices.length) {
				let minX = Number.MAX_VALUE,
					minY = Number.MAX_VALUE;
				let maxX = -Number.MAX_VALUE,
					maxY = -Number.MAX_VALUE;
				for (let i = 0, l = this.vertices.length; i < l; i += 2) {
					const x = this.vertices[i];
					const y = this.vertices[i + 1];
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
				this._bounds.setTo(minX, minY, maxX - minX, maxY - minY);
			} else {
				this._bounds.setTo(0, 0, 0, 0);
			}
		}
		bounds.copyFrom(this._bounds);
	}
}
