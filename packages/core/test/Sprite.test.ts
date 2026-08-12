import { describe, it, expect } from 'vitest';
import { Sprite } from '../src/blakron/display/Sprite.js';
import { DisplayObject } from '../src/blakron/display/DisplayObject.js';
import { RenderObjectType } from '../src/blakron/display/DisplayObject.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';

describe('Sprite', () => {
	it('$renderObjectType is SPRITE', () => {
		const s = new Sprite();
		expect(s.$renderObjectType).toBe(RenderObjectType.SPRITE);
	});

	it('content bounds include graphics', () => {
		const s = new Sprite();
		s.graphics.drawRect(10, 20, 100, 50);
		const bounds = new Rectangle();
		s['$measureContentBounds'](bounds);
		expect(bounds.width).toBeGreaterThanOrEqual(100);
	});

	it('child management inherited from DisplayObjectContainer', () => {
		const s = new Sprite();
		const a = new DisplayObject();
		const b = new DisplayObject();

		s.addChild(a);
		s.addChildAt(b, 0);

		expect(s.getChildAt(0)).toBe(b);
		expect(s.getChildAt(1)).toBe(a);

		s.setChildIndex(b, 1);
		expect(s.getChildAt(0)).toBe(a);
		expect(s.getChildAt(1)).toBe(b);
	});

	it('$onRemoveFromStage does not clear graphics commands', () => {
		const s = new Sprite();
		s.graphics.drawRect(0, 0, 100, 100);
		s['$onRemoveFromStage']();
		expect(s.graphics.commands.length).toBe(1);
	});
});
