import { describe, it, expect } from 'vitest';
import { Mesh } from '../src/blakron/display/Mesh.js';
import { RenderObjectType } from '../src/blakron/display/DisplayObject.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';

describe('Mesh', () => {
	// ── Constructor & defaults ────────────────────────────────────────────

	it('$renderObjectType is MESH', () => {
		const m = new Mesh();
		expect(m.$renderObjectType).toBe(RenderObjectType.MESH);
	});

	it('extends Bitmap (inherits Bitmap properties)', () => {
		const m = new Mesh();
		// Bitmap properties are inherited
		expect(m.smoothing).toBe(true);
		expect(m.pixelHitTest).toBe(false);
	});

	it('default vertices/indices/uvs are empty', () => {
		const m = new Mesh();
		expect(m.vertices).toEqual([]);
		expect(m.indices).toEqual([]);
		expect(m.uvs).toEqual([]);
	});

	// ── updateVertices ────────────────────────────────────────────────────

	it('updateVertices marks $renderDirty', () => {
		const m = new Mesh();
		m.$renderDirty = false;
		m.updateVertices();
		expect(m.$renderDirty).toBe(true);
	});

	// ── $measureContentBounds ──────────────────────────────────────────────

	it('$measureContentBounds with vertices computes bounding box', () => {
		const m = new Mesh();
		m.vertices = [0, 0, 100, 0, 100, 50, 0, 50];
		m.updateVertices();

		const bounds = new Rectangle();
		m['$measureContentBounds'](bounds);

		expect(bounds.x).toBe(0);
		expect(bounds.y).toBe(0);
		expect(bounds.width).toBe(100);
		expect(bounds.height).toBe(50);
	});

	it('$measureContentBounds with negative vertices', () => {
		const m = new Mesh();
		m.vertices = [-50, -30, 50, -30, 50, 30, -50, 30];
		m.updateVertices();

		const bounds = new Rectangle();
		m['$measureContentBounds'](bounds);

		expect(bounds.x).toBe(-50);
		expect(bounds.y).toBe(-30);
		expect(bounds.width).toBe(100);
		expect(bounds.height).toBe(60);
	});

	it('$measureContentBounds with empty vertices returns zero rect', () => {
		const m = new Mesh();
		const bounds = new Rectangle();
		m['$measureContentBounds'](bounds);

		expect(bounds.x).toBe(0);
		expect(bounds.y).toBe(0);
		expect(bounds.width).toBe(0);
		expect(bounds.height).toBe(0);
	});

	it('$measureContentBounds caches result until vertices updated', () => {
		const m = new Mesh();
		m.vertices = [0, 0, 50, 50];
		m.updateVertices();

		const bounds1 = new Rectangle();
		m['$measureContentBounds'](bounds1);
		expect(bounds1.width).toBe(50);

		// Modify vertices without update — should still return cached bounds
		m.vertices = [0, 0, 200, 200];
		const bounds2 = new Rectangle();
		m['$measureContentBounds'](bounds2);
		expect(bounds2.width).toBe(50); // cached

		// After updateVertices, bounds recalculate
		m.updateVertices();
		const bounds3 = new Rectangle();
		m['$measureContentBounds'](bounds3);
		expect(bounds3.width).toBe(200);
	});

	it('$measureContentBounds with single vertex', () => {
		const m = new Mesh();
		m.vertices = [42, 17]; // single point
		m.updateVertices();

		const bounds = new Rectangle();
		m['$measureContentBounds'](bounds);

		expect(bounds.x).toBe(42);
		expect(bounds.y).toBe(17);
		expect(bounds.width).toBe(0);
		expect(bounds.height).toBe(0);
	});
});
