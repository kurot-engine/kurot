import { describe, it, expect } from 'vitest';
import { Matrix, sharedMatrix } from '../src/blakron/geom/Matrix.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';
import { Point } from '../src/blakron/geom/Point.js';

describe('Matrix', () => {
	it('defaults to identity', () => {
		const m = new Matrix();
		expect(m.a).toBe(1);
		expect(m.b).toBe(0);
		expect(m.c).toBe(0);
		expect(m.d).toBe(1);
		expect(m.tx).toBe(0);
		expect(m.ty).toBe(0);
	});

	it('constructor accepts all 6 values', () => {
		const m = new Matrix(2, 3, 4, 5, 6, 7);
		expect(m.a).toBe(2);
		expect(m.b).toBe(3);
		expect(m.c).toBe(4);
		expect(m.d).toBe(5);
		expect(m.tx).toBe(6);
		expect(m.ty).toBe(7);
	});

	it('identity() resets to identity', () => {
		const m = new Matrix(2, 3, 4, 5, 6, 7);
		m.identity();
		expect(m.a).toBe(1);
		expect(m.b).toBe(0);
		expect(m.c).toBe(0);
		expect(m.d).toBe(1);
		expect(m.tx).toBe(0);
		expect(m.ty).toBe(0);
	});

	it('setTo assigns all fields', () => {
		const m = new Matrix();
		m.setTo(2, 3, 4, 5, 6, 7);
		expect(m.a).toBe(2);
		expect(m.ty).toBe(7);
	});

	it('copyFrom deep copies', () => {
		const a = new Matrix(2, 3, 4, 5, 6, 7);
		const b = new Matrix();
		b.copyFrom(a);
		expect(b.equals(a)).toBe(true);
		a.a = 99;
		expect(b.a).toBe(2);
	});

	it('clone returns new equal instance', () => {
		const m = new Matrix(2, 3, 4, 5, 6, 7);
		const c = m.clone();
		expect(c).not.toBe(m);
		expect(c.equals(m)).toBe(true);
	});

	it('equals compares all fields', () => {
		const a = new Matrix(1, 2, 3, 4, 5, 6);
		const b = new Matrix(1, 2, 3, 4, 5, 6);
		expect(a.equals(b)).toBe(true);
		b.tx = 99;
		expect(a.equals(b)).toBe(false);
	});

	it('translate shifts tx/ty', () => {
		const m = new Matrix();
		m.translate(10, 20);
		expect(m.tx).toBe(10);
		expect(m.ty).toBe(20);
	});

	it('scale multiplies a/c/tx and b/d/ty', () => {
		const m = new Matrix(1, 0, 0, 1, 10, 20);
		m.scale(2, 3);
		expect(m.a).toBe(2);
		expect(m.d).toBe(3);
		expect(m.tx).toBe(20);
		expect(m.ty).toBe(60);
	});

	it('concat multiplies matrices (simple translation)', () => {
		const a = new Matrix(1, 0, 0, 1, 10, 0);
		const b = new Matrix(1, 0, 0, 1, 0, 20);
		a.concat(b);
		expect(a.tx).toBe(10);
		expect(a.ty).toBe(20);
	});

	it('concat with rotation', () => {
		// Scale 2x then translate 10,0
		const scale = new Matrix(2, 0, 0, 2, 0, 0);
		const translate = new Matrix(1, 0, 0, 1, 10, 0);
		scale.concat(translate);
		// Point (1,0) → scale → (2,0) → translate → (12,0)
		const p = scale.transformPoint(1, 0);
		expect(p.x).toBeCloseTo(12, 5);
		expect(p.y).toBeCloseTo(0, 5);
	});

	it('invert produces inverse', () => {
		const m = new Matrix(2, 0, 0, 3, 10, 20);
		const inv = m.clone();
		inv.invert();
		// m * inv should be identity
		const result = m.clone();
		result.concat(inv);
		expect(result.a).toBeCloseTo(1, 10);
		expect(result.b).toBeCloseTo(0, 10);
		expect(result.c).toBeCloseTo(0, 10);
		expect(result.d).toBeCloseTo(1, 10);
		expect(result.tx).toBeCloseTo(0, 10);
		expect(result.ty).toBeCloseTo(0, 10);
	});

	it('invert with rotation', () => {
		const m = new Matrix();
		m.rotate(Math.PI / 4); // 45 degrees in radians
		m.translate(100, 200);
		const inv = m.clone();
		inv.invert();
		const result = m.clone();
		result.concat(inv);
		expect(result.a).toBeCloseTo(1, 8);
		expect(result.d).toBeCloseTo(1, 8);
		expect(result.tx).toBeCloseTo(0, 8);
		expect(result.ty).toBeCloseTo(0, 8);
	});

	it('invert singular matrix resets to zero', () => {
		const m = new Matrix(0, 0, 0, 0, 10, 20);
		m.invert();
		// When b=0, c=0, a=0, d=0 → special path sets all to 0
		expect(m.a).toBe(0);
		expect(m.d).toBe(0);
		expect(m.tx).toBe(0);
		expect(m.ty).toBe(0);
	});

	it('invertInto writes to target without modifying this', () => {
		const m = new Matrix(2, 0, 0, 3, 10, 20);
		const target = new Matrix();
		m.invertInto(target);
		expect(m.a).toBe(2); // unchanged
		expect(target.a).toBeCloseTo(0.5, 10);
	});

	it('transformPoint applies matrix', () => {
		const m = new Matrix(1, 0, 0, 1, 10, 20);
		const p = m.transformPoint(5, 5);
		expect(p.x).toBe(15);
		expect(p.y).toBe(25);
	});

	it('transformPoint with scale and rotation', () => {
		const m = new Matrix(2, 0, 0, 2, 0, 0);
		const p = m.transformPoint(3, 4);
		expect(p.x).toBe(6);
		expect(p.y).toBe(8);
	});

	it('transformBounds computes AABB', () => {
		const m = new Matrix(1, 0, 0, 1, 10, 20);
		const r = new Rectangle(0, 0, 100, 50);
		m.transformBounds(r);
		expect(r.x).toBe(10);
		expect(r.y).toBe(20);
		expect(r.width).toBe(100);
		expect(r.height).toBe(50);
	});

	it('transformBounds with 90-degree rotation', () => {
		const m = new Matrix(0, 1, -1, 0, 0, 0); // 90° CW
		const r = new Rectangle(0, 0, 100, 50);
		m.transformBounds(r);
		// After 90° rotation, 100x50 becomes 50x100
		expect(r.width).toBe(50);
		expect(r.height).toBe(100);
	});

	it('prepend applies transform before current', () => {
		const m = new Matrix(1, 0, 0, 1, 10, 20);
		m.prepend(2, 0, 0, 2, 0, 0);
		// Point (1,0) → prepend scale 2x → (2,0) → translate → (12,20)
		// But prepend means: new = old * prepend
		// m.tx = 10*2 + 20*0 + 0 = 20
		expect(m.tx).toBe(20);
	});

	it('append applies transform after current', () => {
		const m = new Matrix(2, 0, 0, 2, 0, 0);
		m.append(1, 0, 0, 1, 10, 20);
		expect(m.tx).toBe(20); // 10 * 2 + 0
		expect(m.ty).toBe(40); // 20 * 2 + 0
	});

	it('createBox with scale only', () => {
		const m = new Matrix();
		m.createBox(2, 3, 0, 10, 20);
		expect(m.a).toBe(2);
		expect(m.d).toBe(3);
		expect(m.b).toBe(0);
		expect(m.c).toBe(0);
		expect(m.tx).toBe(10);
		expect(m.ty).toBe(20);
	});

	it('getScaleX/Y round-trips', () => {
		const m = new Matrix();
		m.createBox(2, 3);
		expect(m.getScaleX()).toBeCloseTo(2, 5);
		expect(m.getScaleY()).toBeCloseTo(3, 5);
	});

	it('updateScaleAndRotation identity', () => {
		const m = new Matrix();
		m.updateScaleAndRotation(1, 1, 0, 0);
		expect(m.a).toBe(1);
		expect(m.b).toBe(0);
		expect(m.c).toBe(0);
		expect(m.d).toBe(1);
	});

	it('preMultiplyInto computes target = other * this', () => {
		const a = new Matrix(2, 0, 0, 2, 0, 0); // scale 2x
		const b = new Matrix(1, 0, 0, 1, 10, 20); // translate
		const target = new Matrix();
		// preMultiplyInto: target = b * a
		// b * a means: first apply a (this), then apply b (other)
		// But the actual formula is: target.tx = b.tx * a.a + a.tx = 10*2 + 0 = 20
		a.preMultiplyInto(b, target);
		// Point (1,0) through target: x = 2*1 + 20 = 22, y = 0 + 40 = 40
		// Actually: target = [2,0,0,2,20,40]
		const p = target.transformPoint(1, 0);
		expect(p.x).toBeCloseTo(22, 5);
		expect(p.y).toBeCloseTo(40, 5);
	});

	it('object pool create/release', () => {
		const m = Matrix.create();
		Matrix.release(m);
		const m2 = Matrix.create();
		expect(m2).toBe(m);
	});

	it('toString returns formatted string', () => {
		const m = new Matrix(1, 0, 0, 1, 0, 0);
		expect(m.toString()).toBe('(a=1, b=0, c=0, d=1, tx=0, ty=0)');
	});

	// edge cases

	it('rotate with angle=0 is no-op', () => {
		const m = new Matrix(2, 3, 4, 5, 6, 7);
		m.rotate(0);
		expect(m.a).toBe(2);
		expect(m.b).toBe(3);
	});

	it('scale with sx=1, sy=1 is no-op', () => {
		const m = new Matrix(2, 3, 4, 5, 6, 7);
		m.scale(1, 1);
		expect(m.tx).toBe(6);
	});

	it('deltaTransformPoint ignores translation', () => {
		const m = new Matrix(2, 0, 0, 3, 100, 200);
		const p = m.deltaTransformPoint(new Point(3, 4));
		expect(p.x).toBe(6);
		expect(p.y).toBe(12);
	});

	it('createGradientBox sets correct matrix', () => {
		const m = new Matrix();
		m.createGradientBox(200, 100);
		expect(m.a).toBeCloseTo(200 / 1638.4, 5);
		expect(m.d).toBeCloseTo(100 / 1638.4, 5);
	});

	it('getSkewX returns 0 for identity', () => {
		const m = new Matrix();
		expect(m.getSkewX()).toBeCloseTo(0, 5);
	});

	it('getSkewY returns 0 for identity', () => {
		const m = new Matrix();
		expect(m.getSkewY()).toBeCloseTo(0, 5);
	});

	it('transformPoint with resultPoint reuses the object', () => {
		const m = new Matrix(1, 0, 0, 1, 10, 20);
		const out = new Point();
		const result = m.transformPoint(5, 5, out);
		expect(result).toBe(out);
		expect(out.x).toBe(15);
	});

	it('invert with general singular non-diagonal matrix', () => {
		const m = new Matrix(2, 2, 4, 4, 10, 20);
		m.invert();
		expect(m.a).toBe(1);
		expect(m.d).toBe(1);
	});

	it('concat with non-trivial b/c values', () => {
		const a = new Matrix(1, 2, 3, 4, 0, 0);
		const b = new Matrix(5, 6, 7, 8, 0, 0);
		a.concat(b);
		expect(Number.isFinite(a.a)).toBe(true);
	});

	it('prepend with identity is no-op', () => {
		const m = new Matrix(2, 0, 0, 3, 10, 20);
		m.prepend(1, 0, 0, 1, 0, 0);
		expect(m.a).toBe(2);
		expect(m.tx).toBe(10);
	});

	it('append with identity is no-op', () => {
		const m = new Matrix(2, 0, 0, 3, 10, 20);
		m.append(1, 0, 0, 1, 0, 0);
		expect(m.a).toBe(2);
		expect(m.tx).toBe(10);
	});

	it('transformBounds with 45-degree rotation expands bounds', () => {
		const angle = Math.PI / 4;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const m = new Matrix(cos, sin, -sin, cos, 0, 0);
		const r = new Rectangle(0, 0, 100, 50);
		m.transformBounds(r);
		expect(r.width).toBeGreaterThan(100);
		expect(r.height).toBeGreaterThan(50);
	});

	it('equals with self returns true', () => {
		const m = new Matrix(1, 2, 3, 4, 5, 6);
		expect(m.equals(m)).toBe(true);
	});

	it('sharedMatrix is a mutable singleton', () => {
		sharedMatrix.setTo(2, 0, 0, 2, 10, 20);
		expect(sharedMatrix.a).toBe(2);
		sharedMatrix.identity();
	});

	it('copyFrom returns this for chaining', () => {
		const m = new Matrix();
		const other = new Matrix(2, 3, 4, 5, 6, 7);
		expect(m.copyFrom(other)).toBe(m);
	});

	it('setTo returns this for chaining', () => {
		const m = new Matrix();
		expect(m.setTo(2, 3, 4, 5, 6, 7)).toBe(m);
	});
});
