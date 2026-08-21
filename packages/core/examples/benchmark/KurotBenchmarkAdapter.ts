import {
	Bitmap,
	BitmapData,
	BlurFilter,
	Shape,
	Sprite,
	StageScaleMode,
	Texture,
	createPlayer,
} from '../../src/index.js';
import type { KurotApp } from '../../src/index.js';
import type { BenchmarkAdapter, BenchmarkBackend, RenderMetrics } from './BenchmarkAdapter.js';
import { DrawCallCounter } from './DrawCallCounter.js';

interface TransformNode {
	x: number;
	y: number;
	rotation: number;
	alpha: number;
}

export class KurotBenchmarkAdapter implements BenchmarkAdapter {
	public readonly engine = 'Kurot';
	public readonly version = '1.0.15';
	public backend = 'unknown';
	public root: object = new Sprite();

	private _app?: KurotApp;
	private readonly _drawCallCounter = new DrawCallCounter();
	private _textures: Texture[] = [];

	public async initialize(
		canvas: HTMLCanvasElement,
		width: number,
		height: number,
		resolution: number,
		requestedBackend: BenchmarkBackend,
	): Promise<void> {
		canvas.width = width * resolution;
		canvas.height = height * resolution;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		const context =
			requestedBackend === 'webgl2'
				? canvas.getContext('webgl2', { antialias: false })
				: canvas.getContext('webgl', { antialias: false });
		if (!context) {
			throw new Error(`${requestedBackend.toUpperCase()} is unavailable for the Kurot benchmark.`);
		}
		this._app = createPlayer({
			canvas,
			contentWidth: width,
			contentHeight: height,
			scaleMode: StageScaleMode.NO_SCALE,
			frameRate: 60,
		});
		this.backend = this._app.player.isWebGL
			? canvas.getContext('webgl2')
				? 'webgl2'
				: 'webgl1'
			: 'canvas2d';
		if (this.backend !== requestedBackend) {
			this._app.destroy();
			this._app = undefined;
			throw new Error(`Requested ${requestedBackend}, but Kurot initialized ${this.backend}.`);
		}
		this._drawCallCounter.attach(canvas);
		this.root = new Sprite();
		this._app.start(this.root as Sprite);
		this._app.stop();
		this._textures = createTextures();
	}

	public createContainer(): object {
		return new Sprite();
	}

	public createSprite(textureIndex: number): object {
		return new Bitmap(this._textures[textureIndex % this._textures.length]);
	}

	public createFilteredRect(color: number, filterIndex: number): object {
		const shape = new Shape();
		shape.graphics.beginFill(color, 1);
		shape.graphics.drawRect(0, 0, 40, 40);
		shape.graphics.endFill();
		shape.filters = [new BlurFilter(2 + (filterIndex % 3), 2 + (filterIndex % 3))];
		return shape;
	}

	public addChild(parent: object, child: object): void {
		(parent as Sprite).addChild(child as Sprite);
	}

	public removeChild(parent: object, child: object): void {
		(parent as Sprite).removeChild(child as Sprite);
	}

	public setPosition(node: object, x: number, y: number): void {
		const target = node as TransformNode;
		target.x = x;
		target.y = y;
	}

	public setRotation(node: object, degrees: number): void {
		(node as TransformNode).rotation = degrees;
	}

	public setAlpha(node: object, alpha: number): void {
		(node as TransformNode).alpha = alpha;
	}

	public setTexture(node: object, textureIndex: number): void {
		(node as Bitmap).texture = this._textures[textureIndex % this._textures.length];
	}

	public render(): RenderMetrics {
		const app = this._app;
		if (!app) throw new Error('Kurot benchmark adapter is not initialized.');
		this._drawCallCounter.reset();
		app.player.render(true, 0);
		return {
			drawCalls: this._drawCallCounter.read(),
			renderTimeMs: app.player.perf.renderTimeMs,
			textureCount: this._textures.length,
			framebufferPoolSize: app.player.framebufferPoolSize,
			framebufferPoolBytes: app.player.framebufferPoolBytes,
		};
	}

	public destroy(): void {
		this._drawCallCounter.detach();
		this._app?.destroy();
		this._app = undefined;
		this._textures = [];
	}
}

function createTextures(): Texture[] {
	const textures: Texture[] = [];
	for (let i = 0; i < 32; i++) {
		const canvas = document.createElement('canvas');
		canvas.width = 32;
		canvas.height = 32;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Failed to create a benchmark texture.');
		context.fillStyle = `hsl(${(i / 32) * 360}, 80%, 60%)`;
		context.fillRect(0, 0, 32, 32);
		const texture = new Texture();
		texture.setBitmapData(new BitmapData(canvas));
		textures.push(texture);
	}
	return textures;
}
