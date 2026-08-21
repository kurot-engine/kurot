import { BitmapData, Sprite, Texture } from '@kurot/core';
import { ArrayCollection, DataGroup, Group, Image, ItemRenderer, Label, Rect, VerticalLayout } from '@kurot/ui';
import type { BenchmarkScenario, ScenarioContext, ValidationMetrics } from './types.js';

class MeasuredImage extends Image {
	public static metrics?: ValidationMetrics;

	public override commitProperties(): void {
		MeasuredImage.metrics!.commitProperties++;
		super.commitProperties();
	}

	public override measure(): void {
		MeasuredImage.metrics!.measure++;
		super.measure();
	}

	public override updateDisplayList(width: number, height: number): void {
		MeasuredImage.metrics!.updateDisplayList++;
		super.updateDisplayList(width, height);
	}
}

function createCellTexture(): Texture {
	const source = document.createElement('canvas');
	source.width = 32;
	source.height = 20;
	const context = source.getContext('2d');
	if (!context) throw new Error('Failed to create the UI benchmark texture.');
	context.fillStyle = '#315ea8';
	context.fillRect(0, 0, 32, 20);
	context.fillStyle = '#78a7f5';
	context.fillRect(3, 3, 8, 14);
	const texture = new Texture();
	texture.setBitmapData(new BitmapData(source));
	return texture;
}

let staticTexture: Texture | undefined;
let animationTexture: Texture | undefined;

class BenchmarkItemRenderer extends ItemRenderer {
	public static metrics?: ValidationMetrics;
	private readonly background = new Rect(360, 28, 0x18223d);
	private readonly label = new Label();

	public constructor() {
		super();
		BenchmarkItemRenderer.metrics!.rendererCreated++;
		this.width = 360;
		this.height = 28;
		this.label.x = 10;
		this.label.y = 4;
		this.label.size = 14;
		this.label.textColor = 0xe7edff;
		this.addChild(this.background);
		this.addChild(this.label);
	}

	protected override dataChanged(): void {
		BenchmarkItemRenderer.metrics!.rendererReused++;
		this.label.text = String(this.data ?? '');
	}
}

const staticSkin: BenchmarkScenario = {
	id: 'static-skin',
	name: 'Large static skin',
	description: '400 UI nodes; stable frames should perform no repeated validation.',
	objectCount: 400,
	setup({ root, metrics }): void {
		MeasuredImage.metrics = metrics;
		staticTexture = createCellTexture();
		const panel = new Group();
		panel.width = 760;
		panel.height = 560;
		panel.x = 20;
		panel.y = 20;
		root.addChild(panel);
		for (let i = 0; i < 400; i++) {
			const cell = new MeasuredImage(staticTexture);
			cell.width = 34;
			cell.height = 20;
			cell.alpha = i % 2 === 0 ? 1 : 0.72;
			cell.x = (i % 20) * 37;
			cell.y = Math.floor(i / 20) * 27;
			panel.addChild(cell);
		}
		panel.validateNow();
	},
	update(): void {},
	teardown({ root }): void {
		root.removeChildren();
		staticTexture?.dispose();
		staticTexture = undefined;
		MeasuredImage.metrics = undefined;
	},
};

const transformAnimation: BenchmarkScenario = {
	id: 'transform-alpha',
	name: 'Transform / alpha animation',
	description: '240 UI nodes animate transform and alpha without changing size constraints.',
	objectCount: 240,
	setup({ root, metrics }): void {
		MeasuredImage.metrics = metrics;
		animationTexture = createCellTexture();
		const layer = new Group();
		layer.name = 'animation-layer';
		layer.width = 800;
		layer.height = 600;
		root.addChild(layer);
		for (let i = 0; i < 240; i++) {
			const cell = new MeasuredImage(animationTexture);
			cell.width = 24;
			cell.height = 16;
			cell.name = `cell-${i}`;
			cell.x = 16 + (i % 24) * 32;
			cell.y = 20 + Math.floor(i / 24) * 52;
			layer.addChild(cell);
		}
		layer.validateNow();
	},
	update(frame, { root }): void {
		const layer = root.getChildAt(0) as Group;
		for (let i = 0; i < layer.numChildren; i++) {
			const cell = layer.getChildAt(i)!;
			const phase = frame * 0.045 + i * 0.13;
			cell.x = 16 + (i % 24) * 32 + Math.sin(phase) * 5;
			cell.y = 20 + Math.floor(i / 24) * 52 + Math.cos(phase) * 3;
			cell.scaleX = cell.scaleY = 0.9 + Math.sin(phase) * 0.1;
			cell.rotation = Math.sin(phase) * 0.05;
			cell.alpha = 0.65 + Math.cos(phase) * 0.35;
		}
	},
	teardown({ root }): void {
		root.removeChildren();
		animationTexture?.dispose();
		animationTexture = undefined;
		MeasuredImage.metrics = undefined;
	},
};

const virtualList: BenchmarkScenario = {
	id: 'virtual-list',
	name: 'Virtual list scrolling',
	description: '10,000 records with only visible ItemRenderers retained.',
	objectCount: 10_000,
	setup({ root, metrics }): void {
		BenchmarkItemRenderer.metrics = metrics;
		const list = new DataGroup();
		const layout = new VerticalLayout();
		layout.useVirtualLayout = true;
		layout.gap = 2;
		list.layout = layout;
		list.useVirtualLayout = true;
		list.itemRenderer = BenchmarkItemRenderer;
		list.dataProvider = new ArrayCollection(Array.from({ length: 10_000 }, (_, i) => `Record ${i + 1}`));
		list.width = 380;
		list.height = 520;
		list.x = 210;
		list.y = 40;
		list.scrollEnabled = true;
		root.addChild(list);
		list.validateNow();
	},
	update(frame, { root }): void {
		const list = root.getChildAt(0) as DataGroup;
		const range = Math.max(0, list.contentHeight - list.height);
		list.scrollV = range === 0 ? 0 : (frame * 7) % range;
		list.validateNow();
		BenchmarkItemRenderer.metrics!.maxLiveRenderers = Math.max(
			BenchmarkItemRenderer.metrics!.maxLiveRenderers,
			list.numChildren,
		);
	},
	teardown({ root }): void {
		root.removeChildren();
		BenchmarkItemRenderer.metrics = undefined;
	},
};

export const scenarios: readonly BenchmarkScenario[] = [staticSkin, transformAnimation, virtualList];

export function createScenarioRoot(): Sprite {
	return new Sprite();
}
