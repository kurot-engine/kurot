import { Application, BlurFilter, Container, Graphics, Sprite, Texture, VERSION } from 'pixi.js';
import type { BenchmarkAdapter, BenchmarkBackend, RenderMetrics } from './BenchmarkAdapter.js';
import { DrawCallCounter } from './DrawCallCounter.js';

interface TransformNode {
	x: number;
	y: number;
	angle: number;
	alpha: number;
}

export class PixiBenchmarkAdapter implements BenchmarkAdapter {
	public readonly engine = 'PixiJS';
	public readonly version = VERSION;
	public backend = 'unknown';
	public root: object = new Container();

	private _app?: Application;
	private readonly _drawCallCounter = new DrawCallCounter();
	private _textures: Texture[] = [];

	public async initialize(
		canvas: HTMLCanvasElement,
		width: number,
		height: number,
		resolution: number,
		requestedBackend: BenchmarkBackend,
	): Promise<void> {
		const app = new Application();
		await app.init({
			canvas,
			width,
			height,
			resolution,
			autoDensity: false,
			autoStart: false,
			antialias: false,
			preference: 'webgl',
			preferWebGLVersion: requestedBackend === 'webgl2' ? 2 : 1,
		});
		app.stop();
		this._app = app;
		this.root = app.stage;
		this.backend = canvas.getContext('webgl2') ? 'webgl2' : 'webgl1';
		if (this.backend !== requestedBackend) {
			app.destroy({ removeView: false }, { children: true, texture: false, textureSource: false });
			this._app = undefined;
			throw new Error(`Requested ${requestedBackend}, but PixiJS initialized ${this.backend}.`);
		}
		this._drawCallCounter.attach(canvas);
		this._textures = createTextures();
	}

	public createContainer(): object {
		return new Container();
	}

	public createSprite(textureIndex: number): object {
		return new Sprite(this._textures[textureIndex % this._textures.length]);
	}

	public createFilteredRect(color: number, filterIndex: number): object {
		const graphics = new Graphics().rect(0, 0, 40, 40).fill(color);
		graphics.filters = [new BlurFilter({ strength: 2 + (filterIndex % 3), quality: 1 })];
		return graphics;
	}

	public addChild(parent: object, child: object): void {
		(parent as Container).addChild(child as Container);
	}

	public removeChild(parent: object, child: object): void {
		(parent as Container).removeChild(child as Container);
	}

	public setPosition(node: object, x: number, y: number): void {
		const target = node as TransformNode;
		target.x = x;
		target.y = y;
	}

	public setRotation(node: object, degrees: number): void {
		(node as TransformNode).angle = degrees;
	}

	public setAlpha(node: object, alpha: number): void {
		(node as TransformNode).alpha = alpha;
	}

	public setTexture(node: object, textureIndex: number): void {
		(node as Sprite).texture = this._textures[textureIndex % this._textures.length];
	}

	public render(): RenderMetrics {
		const app = this._app;
		if (!app) throw new Error('PixiJS benchmark adapter is not initialized.');
		this._drawCallCounter.reset();
		const start = performance.now();
		app.renderer.render(app.stage);
		return {
			drawCalls: this._drawCallCounter.read(),
			renderTimeMs: performance.now() - start,
		};
	}

	public destroy(): void {
		this._drawCallCounter.detach();
		this._app?.destroy({ removeView: false }, { children: true, texture: false, textureSource: false });
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
		textures.push(Texture.from(canvas));
	}
	return textures;
}
