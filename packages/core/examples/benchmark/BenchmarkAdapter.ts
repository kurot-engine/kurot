export interface RenderMetrics {
	drawCalls: number;
	renderTimeMs: number;
	textureCount: number;
	framebufferPoolSize?: number;
	framebufferPoolBytes?: number;
}

export type BenchmarkBackend = 'webgl1' | 'webgl2';

export interface BenchmarkAdapter {
	readonly engine: string;
	readonly version: string;
	readonly backend: string;
	readonly root: object;
	initialize(
		canvas: HTMLCanvasElement,
		width: number,
		height: number,
		resolution: number,
		backend: BenchmarkBackend,
	): Promise<void>;
	createContainer(): object;
	createSprite(textureIndex: number): object;
	createFilteredRect(color: number, filterIndex: number): object;
	addChild(parent: object, child: object): void;
	removeChild(parent: object, child: object): void;
	setPosition(node: object, x: number, y: number): void;
	setRotation(node: object, degrees: number): void;
	setAlpha(node: object, alpha: number): void;
	setTexture(node: object, textureIndex: number): void;
	render(): RenderMetrics;
	destroy(): void;
}
