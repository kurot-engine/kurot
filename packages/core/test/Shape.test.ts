import { describe, it, expect } from 'vitest';
import { Shape } from '../src/blakron/display/Shape.js';
import { RenderObjectType } from '../src/blakron/display/DisplayObject.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';

describe('Shape', () => {
	it('$renderObjectType is SHAPE', () => {
		const s = new Shape();
		expect(s.$renderObjectType).toBe(RenderObjectType.SHAPE);
	});

	it('drawing on graphics updates content bounds', () => {
		const s = new Shape();
		s.graphics.drawRect(0, 0, 100, 50);
		const bounds = new Rectangle();
		s['$measureContentBounds'](bounds);
		expect(bounds.width).toBeGreaterThanOrEqual(100);
		expect(bounds.height).toBeGreaterThanOrEqual(50);
	});

	it('empty graphics returns empty bounds', () => {
		const s = new Shape();
		const bounds = new Rectangle();
		s['$measureContentBounds'](bounds);
		expect(bounds.isEmpty()).toBe(true);
	});

	it('visible setter affects $renderMode', () => {
		const s = new Shape();
		s.visible = false;
		expect(s.$renderMode).toBe(1); // RenderMode.NONE
		s.visible = true;
		expect(s.$renderMode).toBeUndefined();
	});

	it('rotation and scale change $useTranslate', () => {
		const s = new Shape();
		s.rotation = 45;
		expect(s.$useTranslate).toBe(true);
		s.rotation = 0;
		expect(s.$useTranslate).toBe(false);
	});
});
