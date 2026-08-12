import { describe, it, expect } from 'vitest';
import { Point, sharedPoint } from '../src/blakron/geom/Point.js';

describe('Point', () => {
	it('defaults to (0, 0)', () => {
		const p = new Point();
		expect(p.x).toBe(0);
		expect(p.y).toBe(0);
	});

	it('constructor accepts x, y', () => {
		const p = new Point(3, 4);
		expect(p.x).toBe(3);
		expect(p.y).toBe(4);
	});

	it('setTo updates x and y', () => {
		const p = new Point();
		p.setTo(5, 6);
		expect(p.x).toBe(5);
		expect(p.y).toBe(6);
	});

	it('setTo returns this for chaining', () => {
		const p = new Point();
		expect(p.setTo(1, 2)).toBe(p);
	});

	it('clone returns a new equal instance', () => {
		const p = new Point(1, 2);
		const c = p.clone();
		expect(c).not.toBe(p);
		expect(c.equals(p)).toBe(true);
	});

	it('copyFrom copies values', () => {
		const a = new Point(10, 20);
		const b = new Point();
		b.copyFrom(a);
		expect(b.x).toBe(10);
		expect(b.y).toBe(20);
		a.x = 99;
		expect(b.x).toBe(10); // independent
	});

	it('equals compares values', () => {
		expect(new Point(1, 2).equals(new Point(1, 2))).toBe(true);
		expect(new Point(1, 2).equals(new Point(1, 3))).toBe(false);
	});

	it('equals with negative values', () => {
		expect(new Point(-1, -2).equals(new Point(-1, -2))).toBe(true);
		expect(new Point(-1, -2).equals(new Point(-1, 2))).toBe(false);
	});

	it('length is Euclidean distance from origin', () => {
		expect(new Point(3, 4).length).toBe(5);
		expect(new Point(0, 0).length).toBe(0);
	});

	it('length with negative coordinates', () => {
		expect(new Point(-3, -4).length).toBe(5);
	});

	it('normalize scales to given thickness', () => {
		const p = new Point(3, 4);
		p.normalize(10);
		expect(p.length).toBeCloseTo(10, 10);
	});

	it('normalize on zero point does nothing', () => {
		const p = new Point(0, 0);
		p.normalize(5);
		expect(p.x).toBe(0);
		expect(p.y).toBe(0);
	});

	it('normalize with thickness 0 scales to zero', () => {
		const p = new Point(3, 4);
		p.normalize(0);
		expect(p.x).toBe(0);
		expect(p.y).toBe(0);
	});

	it('normalize with negative thickness reverses direction', () => {
		const p = new Point(3, 4);
		p.normalize(-5);
		expect(p.length).toBeCloseTo(5, 10);
		expect(p.x).toBeLessThan(0);
		expect(p.y).toBeLessThan(0);
	});

	it('offset adds dx, dy', () => {
		const p = new Point(1, 2);
		p.offset(10, 20);
		expect(p.x).toBe(11);
		expect(p.y).toBe(22);
	});

	it('offset with negative values', () => {
		const p = new Point(5, 5);
		p.offset(-3, -7);
		expect(p.x).toBe(2);
		expect(p.y).toBe(-2);
	});

	it('add returns new point', () => {
		const r = new Point(1, 2).add(new Point(3, 4));
		expect(r.x).toBe(4);
		expect(r.y).toBe(6);
	});

	it('add with negative values', () => {
		const r = new Point(-2, 5).add(new Point(3, -8));
		expect(r.x).toBe(1);
		expect(r.y).toBe(-3);
	});

	it('subtract returns new point', () => {
		const r = new Point(5, 7).subtract(new Point(2, 3));
		expect(r.x).toBe(3);
		expect(r.y).toBe(4);
	});

	it('subtract with negative values', () => {
		const r = new Point(1, 1).subtract(new Point(-2, 5));
		expect(r.x).toBe(3);
		expect(r.y).toBe(-4);
	});

	it('static distance', () => {
		expect(Point.distance(new Point(0, 0), new Point(3, 4))).toBe(5);
	});

	it('static distance same point', () => {
		expect(Point.distance(new Point(5, 5), new Point(5, 5))).toBe(0);
	});

	it('static distance with negative coordinates', () => {
		expect(Point.distance(new Point(-1, -1), new Point(-4, -5))).toBe(5);
	});

	it('static interpolate at f=0 returns first point', () => {
		const p = Point.interpolate(new Point(10, 20), new Point(30, 40), 0);
		expect(p.x).toBe(30); // Note: f1 = 1-f, so at f=0: pt2*1 + pt1*0 = pt2
		expect(p.y).toBe(40);
	});

	it('static interpolate at f=1 returns second point', () => {
		const p = Point.interpolate(new Point(10, 20), new Point(30, 40), 1);
		expect(p.x).toBe(10);
		expect(p.y).toBe(20);
	});

	it('static interpolate at f=0.5', () => {
		const p = Point.interpolate(new Point(0, 0), new Point(10, 10), 0.5);
		expect(p.x).toBe(5);
		expect(p.y).toBe(5);
	});

	it('static polar (angle in degrees)', () => {
		const p = Point.polar(1, 0);
		expect(p.x).toBeCloseTo(1, 5);
		expect(p.y).toBeCloseTo(0, 5);

		const p90 = Point.polar(1, 90);
		expect(p90.x).toBeCloseTo(0, 5);
		expect(p90.y).toBeCloseTo(1, 5);
	});

	it('static polar with negative angle', () => {
		const p = Point.polar(1, -90);
		expect(p.x).toBeCloseTo(0, 5);
		expect(p.y).toBeCloseTo(-1, 5);
	});

	it('static polar with 180 degrees', () => {
		const p = Point.polar(1, 180);
		expect(p.x).toBeCloseTo(-1, 5);
		expect(p.y).toBeCloseTo(0, 5);
	});

	it('static polar with zero length returns origin', () => {
		const p = Point.polar(0, 45);
		expect(p.x).toBe(0);
		expect(p.y).toBe(0);
	});

	it('toString returns formatted string', () => {
		expect(new Point(3, 4).toString()).toBe('(x=3, y=4)');
		expect(new Point().toString()).toBe('(x=0, y=0)');
		expect(new Point(-1.5, 2.7).toString()).toBe('(x=-1.5, y=2.7)');
	});

	it('object pool create/release', () => {
		const p = Point.create(7, 8);
		expect(p.x).toBe(7);
		Point.release(p);
		const p2 = Point.create(0, 0);
		expect(p2).toBe(p); // reused
	});

	it('object pool can hold multiple instances', () => {
		const p1 = Point.create(1, 2);
		const p2 = Point.create(3, 4);
		Point.release(p2);
		Point.release(p1);
		// LIFO: p1 comes back first
		const r1 = Point.create(0, 0);
		const r2 = Point.create(0, 0);
		expect(r1).toBe(p1);
		expect(r2).toBe(p2);
	});

	it('sharedPoint is a mutable singleton', () => {
		sharedPoint.setTo(100, 200);
		expect(sharedPoint.x).toBe(100);
		expect(sharedPoint.y).toBe(200);
		// Reset to avoid test pollution
		sharedPoint.setTo(0, 0);
	});

	it('setTo chaining allows fluent API', () => {
		const p = new Point();
		const result = p.setTo(10, 20);
		expect(result).toBe(p);
		expect(result.x).toBe(10);
		expect(result.y).toBe(20);
	});
});
