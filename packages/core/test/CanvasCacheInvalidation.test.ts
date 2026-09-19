import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DisplayObject } from '../src/kurot/display/DisplayObject.js';
import { DisplayObjectContainer } from '../src/kurot/display/DisplayObjectContainer.js';
import { Rectangle } from '../src/kurot/geom/Rectangle.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';

class BoundedDisplayObject extends DisplayObject {
	public override $measureContentBounds(bounds: Rectangle): void {
		bounds.setTo(0, 0, 20, 20);
	}
}

class BoundedContainer extends DisplayObjectContainer {
	public override $measureContentBounds(bounds: Rectangle): void {
		bounds.setTo(0, 0, 20, 20);
	}
}

function createContext(): CanvasRenderingContext2D {
	return {
		clearRect: vi.fn(),
		drawImage: vi.fn(),
		fillRect: vi.fn(),
		restore: vi.fn(),
		save: vi.fn(),
		setTransform: vi.fn(),
		transform: vi.fn(),
		globalAlpha: 1,
		globalCompositeOperation: 'source-over',
		imageSmoothingEnabled: true,
	} as unknown as CanvasRenderingContext2D;
}

describe('Canvas display-list cache invalidation', () => {
	let context: CanvasRenderingContext2D;

	beforeEach(() => {
		context = createContext();
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('allows repeated descendant changes to reach a cached ancestor through ordinary containers', () => {
		const scene = new DisplayObjectContainer();
		const root = new BoundedContainer();
		const middle = new DisplayObjectContainer();
		const leaf = new BoundedDisplayObject();
		scene.addChild(root);
		root.addChild(middle);
		middle.addChild(leaf);
		root.cacheAsBitmap = true;
		const clear = vi.spyOn(root.$displayList!.canvasBuffer, 'clear');
		const renderer = new CanvasRenderer();

		renderer.renderToContext(scene, context, 0, 0);
		expect(middle.$cacheDirty).toBe(false);
		expect(clear).toHaveBeenCalledTimes(1);

		leaf.alpha = 0.5;
		expect(root.$cacheDirty).toBe(true);
		renderer.renderToContext(scene, context, 0, 0);
		expect(middle.$cacheDirty).toBe(false);
		expect(clear).toHaveBeenCalledTimes(2);

		leaf.alpha = 0.75;
		expect(root.$cacheDirty).toBe(true);
		renderer.renderToContext(scene, context, 0, 0);
		expect(clear).toHaveBeenCalledTimes(3);

		renderer.renderToContext(scene, context, 0, 0);
		expect(clear).toHaveBeenCalledTimes(3);
	});

	it('propagates descendant changes through a nested cached container', () => {
		const scene = new DisplayObjectContainer();
		const root = new BoundedContainer();
		const nestedCache = new BoundedContainer();
		const leaf = new BoundedDisplayObject();
		scene.addChild(root);
		root.addChild(nestedCache);
		nestedCache.addChild(leaf);
		root.cacheAsBitmap = true;
		nestedCache.cacheAsBitmap = true;
		const renderer = new CanvasRenderer();

		renderer.renderToContext(scene, context, 0, 0);
		expect(root.$cacheDirty).toBe(false);
		expect(nestedCache.$cacheDirty).toBe(false);

		leaf.visible = false;
		expect(nestedCache.$cacheDirty).toBe(true);
		expect(root.$cacheDirty).toBe(true);
	});
});
