import type { BenchmarkAdapter, BenchmarkBackend, RenderMetrics } from './BenchmarkAdapter.js';
import { DrawCallCounter } from './DrawCallCounter.js';

interface EgretDisplayObject {
	x: number;
	y: number;
	rotation: number;
	alpha: number;
	filters: object[];
}

interface EgretContainer extends EgretDisplayObject {
	addChild(child: EgretDisplayObject): EgretDisplayObject;
	removeChild(child: EgretDisplayObject): EgretDisplayObject;
}

interface EgretBitmap extends EgretDisplayObject {
	texture: EgretTexture;
}

interface EgretGraphics {
	beginFill(color: number, alpha?: number): void;
	drawRect(x: number, y: number, width: number, height: number): void;
	endFill(): void;
}

interface EgretShape extends EgretDisplayObject {
	graphics: EgretGraphics;
}

interface EgretBitmapData {
	$deleteSource: boolean;
}

interface EgretTexture {
	_setBitmapData(bitmapData: EgretBitmapData): void;
}

interface EgretDisplayList {
	drawToSurface(): number;
}

interface EgretStage extends EgretContainer {
	$displayList: EgretDisplayList;
}

interface EgretPlayer {
	pause(): void;
	stop(): void;
}

interface EgretWebPlayer {
	stage: EgretStage;
	player: EgretPlayer;
}

interface EgretNamespace {
	Bitmap: new (texture: EgretTexture) => EgretBitmap;
	BitmapData: new (source: HTMLCanvasElement) => EgretBitmapData;
	BlurFilter: new (blurX: number, blurY: number) => object;
	DisplayObjectContainer: new () => EgretContainer;
	Shape: new () => EgretShape;
	Texture: new () => EgretTexture;
	Capabilities?: {
		engineVersion?: string;
	};
	runEgret(options: { renderMode: 'webgl'; canvasScaleFactor: number; antialias: boolean }): void;
	sys: {
		systemRenderer: {
			renderClear?: () => void;
		};
	};
}

interface EgretHostElement extends HTMLDivElement {
	'egret-player'?: EgretWebPlayer;
}

interface TransformNode {
	x: number;
	y: number;
	rotation: number;
	alpha: number;
}

export class EgretBenchmarkAdapter implements BenchmarkAdapter {
	public readonly engine = 'Egret';
	public version = '5.4.1';
	public readonly backend = 'webgl1';
	public root: object = {};

	private _egret?: EgretNamespace;
	private readonly _drawCallCounter = new DrawCallCounter();
	private _host?: EgretHostElement;
	private _player?: EgretPlayer;
	private _stage?: EgretStage;
	private _textures: EgretTexture[] = [];

	public async initialize(
		canvas: HTMLCanvasElement,
		width: number,
		height: number,
		resolution: number,
		requestedBackend: BenchmarkBackend,
	): Promise<void> {
		if (requestedBackend !== 'webgl1') {
			throw new Error('Egret 5.4.1 benchmark supports WebGL 1 only.');
		}
		if (resolution !== 1) {
			throw new Error('Egret 5.4.1 benchmark supports resolution 1 only.');
		}
		await loadScript(new URL('./egret.min.js', import.meta.url).href);
		await loadScript(new URL('./egret.web.min.js', import.meta.url).href);
		const runtime = (globalThis as typeof globalThis & { egret?: EgretNamespace }).egret;
		if (!runtime) {
			throw new Error('Egret runtime failed to initialize.');
		}

		const viewport = canvas.parentElement;
		if (!viewport) {
			throw new Error('Egret benchmark requires a viewport element.');
		}
		canvas.hidden = true;
		const host = document.createElement('div') as EgretHostElement;
		host.className = 'egret-player';
		host.dataset.contentWidth = String(width);
		host.dataset.contentHeight = String(height);
		host.dataset.scaleMode = 'exactFit';
		host.dataset.frameRate = '60';
		viewport.append(host);

		runtime.runEgret({ renderMode: 'webgl', canvasScaleFactor: 1, antialias: false });
		await nextAnimationFrame();
		await nextAnimationFrame();
		const webPlayer = host['egret-player'];
		if (!webPlayer?.stage) {
			throw new Error('Egret stage failed to initialize.');
		}
		const surface = host.querySelector('canvas');
		if (!surface || surface.width !== width || surface.height !== height) {
			throw new Error('Egret benchmark initialized an unexpected backing size.');
		}
		this._drawCallCounter.attach(surface);
		webPlayer.player.pause();
		this.version = runtime.Capabilities?.engineVersion ?? this.version;
		this._egret = runtime;
		this._host = host;
		this._player = webPlayer.player;
		this._stage = webPlayer.stage;
		this.root = new runtime.DisplayObjectContainer();
		webPlayer.stage.addChild(this.root as EgretContainer);
		this._textures = createTextures(runtime);
	}

	public createContainer(): object {
		const runtime = this._requireRuntime();
		return new runtime.DisplayObjectContainer();
	}

	public createSprite(textureIndex: number): object {
		const runtime = this._requireRuntime();
		return new runtime.Bitmap(this._textures[textureIndex % this._textures.length]);
	}

	public createFilteredRect(color: number, filterIndex: number): object {
		const runtime = this._requireRuntime();
		const shape = new runtime.Shape();
		shape.graphics.beginFill(color, 1);
		shape.graphics.drawRect(0, 0, 40, 40);
		shape.graphics.endFill();
		const strength = 2 + (filterIndex % 3);
		shape.filters = [new runtime.BlurFilter(strength, strength)];
		return shape;
	}

	public addChild(parent: object, child: object): void {
		(parent as EgretContainer).addChild(child as EgretDisplayObject);
	}

	public removeChild(parent: object, child: object): void {
		(parent as EgretContainer).removeChild(child as EgretDisplayObject);
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
		(node as EgretBitmap).texture = this._textures[textureIndex % this._textures.length];
	}

	public render(): RenderMetrics {
		const runtime = this._requireRuntime();
		const displayList = this._stage?.$displayList;
		if (!displayList) {
			throw new Error('Egret benchmark adapter is not initialized.');
		}
		const start = performance.now();
		this._drawCallCounter.reset();
		runtime.sys.systemRenderer.renderClear?.();
		displayList.drawToSurface();
		return {
			drawCalls: this._drawCallCounter.read(),
			renderTimeMs: performance.now() - start,
			textureCount: this._textures.length,
		};
	}

	public destroy(): void {
		this._drawCallCounter.detach();
		this._player?.stop();
		this._host?.remove();
		this._egret = undefined;
		this._host = undefined;
		this._player = undefined;
		this._stage = undefined;
		this._textures = [];
	}

	private _requireRuntime(): EgretNamespace {
		if (!this._egret) {
			throw new Error('Egret benchmark adapter is not initialized.');
		}
		return this._egret;
	}
}

function createTextures(runtime: EgretNamespace): EgretTexture[] {
	const textures: EgretTexture[] = [];
	for (let i = 0; i < 32; i++) {
		const canvas = document.createElement('canvas');
		canvas.width = 32;
		canvas.height = 32;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('Failed to create a benchmark texture.');
		context.fillStyle = `hsl(${(i / 32) * 360}, 80%, 60%)`;
		context.fillRect(0, 0, 32, 32);
		const bitmapData = new runtime.BitmapData(canvas);
		bitmapData.$deleteSource = false;
		const texture = new runtime.Texture();
		texture._setBitmapData(bitmapData);
		textures.push(texture);
	}
	return textures;
}

function loadScript(source: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = source;
		script.addEventListener('load', () => resolve(), { once: true });
		script.addEventListener('error', () => reject(new Error(`Failed to load ${source}.`)), { once: true });
		document.head.append(script);
	});
}

function nextAnimationFrame(): Promise<void> {
	return new Promise(resolve => requestAnimationFrame(() => resolve()));
}
