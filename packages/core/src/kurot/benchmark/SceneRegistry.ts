import type { SceneDescriptor } from './BenchmarkRunner.js';

/**
 * 场景工厂接口，用于在测试中注入 mock，在 HTML 中注入真实 Blakron 对象。
 */
export interface SceneFactory {
	createBitmap(texIndex?: number): unknown;
	createShape(): unknown;
	createSprite(): unknown;
	addChild(parent: unknown, child: unknown): void;
	removeChild(parent: unknown, child: unknown): void;
	addEventListener(target: unknown, event: string, handler: () => void): void;
	removeEventListener(target: unknown, event: string, handler: () => void): void;
}

export const scenes: SceneDescriptor[] = [
	{
		id: 'sprite-batch',
		label: 'Sprite Batch',
		defaultCount: 500,
		minCount: 50,
		maxCount: 2000,
		build(container: unknown, count: number, factory?: SceneFactory): () => void {
			const c = container as any;
			const $children: unknown[] = [];
			for (let i = 0; i < count; i++) {
				let bmp: any;
				if (factory) {
					bmp = factory.createBitmap(0);
					(bmp as any).x = Math.random() * 760;
					(bmp as any).y = Math.random() * 560;
					factory.addChild(container, bmp);
				} else {
					bmp = c._createBitmap?.() ?? { x: 0, y: 0 };
					bmp.x = Math.random() * 760;
					bmp.y = Math.random() * 560;
					c.addChild?.(bmp);
				}
				$children.push(bmp);
			}
			return () => {
				if (factory) {
					$children.forEach(ch => factory.removeChild(container, ch));
				} else {
					$children.forEach(ch => c.removeChild?.(ch));
				}
			};
		},
	},
	{
		id: 'mixed-texture',
		label: 'Mixed Texture',
		defaultCount: 400,
		minCount: 50,
		maxCount: 2000,
		build(container: unknown, count: number, factory?: SceneFactory): () => void {
			const c = container as any;
			const $children: unknown[] = [];
			const numTextures = 8;
			const perTex = Math.floor(count / numTextures);
			for (let t = 0; t < numTextures; t++) {
				for (let i = 0; i < perTex; i++) {
					let bmp: any;
					if (factory) {
						bmp = factory.createBitmap(t);
						(bmp as any).x = Math.random() * 760;
						(bmp as any).y = Math.random() * 560;
						factory.addChild(container, bmp);
					} else {
						bmp = c._createBitmap?.(t) ?? { x: 0, y: 0 };
						bmp.x = Math.random() * 760;
						bmp.y = Math.random() * 560;
						c.addChild?.(bmp);
					}
					$children.push(bmp);
				}
			}
			return () => {
				if (factory) {
					$children.forEach(ch => factory.removeChild(container, ch));
				} else {
					$children.forEach(ch => c.removeChild?.(ch));
				}
			};
		},
	},
	{
		id: 'filter-heavy',
		label: 'Filter Heavy',
		defaultCount: 50,
		minCount: 50,
		maxCount: 200,
		build(container: unknown, count: number, factory?: SceneFactory): () => void {
			const c = container as any;
			const $children: unknown[] = [];
			for (let i = 0; i < count; i++) {
				let shape: any;
				if (factory) {
					shape = factory.createShape();
					(shape as any).x = (i % 10) * 75 + 10;
					(shape as any).y = Math.floor(i / 10) * 75 + 10;
					factory.addChild(container, shape);
				} else {
					shape = c._createShape?.() ?? { x: 0, y: 0, filters: [] };
					shape.x = (i % 10) * 75 + 10;
					shape.y = Math.floor(i / 10) * 75 + 10;
					c.addChild?.(shape);
				}
				$children.push(shape);
			}
			return () => {
				if (factory) {
					$children.forEach(ch => factory.removeChild(container, ch));
				} else {
					$children.forEach(ch => c.removeChild?.(ch));
				}
			};
		},
	},
	{
		id: 'dynamic-transform',
		label: 'Dynamic Transform',
		defaultCount: 300,
		minCount: 50,
		maxCount: 2000,
		build(container: unknown, count: number, factory?: SceneFactory): () => void {
			const c = container as any;
			const objects: Array<{ bmp: any; phase: number; speed: number }> = [];
			for (let i = 0; i < count; i++) {
				let bmp: any;
				if (factory) {
					bmp = factory.createBitmap(0);
					(bmp as any).x = Math.random() * 760;
					(bmp as any).y = Math.random() * 560;
					factory.addChild(container, bmp);
				} else {
					bmp = c._createBitmap?.() ?? { x: 0, y: 0, rotation: 0, alpha: 1 };
					bmp.x = Math.random() * 760;
					bmp.y = Math.random() * 560;
					c.addChild?.(bmp);
				}
				objects.push({ bmp, phase: Math.random() * Math.PI * 2, speed: 0.02 + Math.random() * 0.03 });
			}

			const onFrame = () => {
				for (const o of objects) {
					o.phase += o.speed;
					o.bmp.x = 380 + Math.cos(o.phase) * (300 + Math.random() * 50);
					o.bmp.y = 280 + Math.sin(o.phase) * (200 + Math.random() * 50);
					o.bmp.rotation = (o.bmp.rotation ?? 0) + 1.5;
					o.bmp.alpha = 0.5 + 0.5 * Math.sin(o.phase * 2);
				}
			};

			if (factory) {
				factory.addEventListener(container, 'enterFrame', onFrame);
			} else {
				c.addEventListener?.('enterFrame', onFrame);
			}

			return () => {
				if (factory) {
					factory.removeEventListener(container, 'enterFrame', onFrame);
					objects.forEach(o => factory.removeChild(container, o.bmp));
				} else {
					c.removeEventListener?.('enterFrame', onFrame);
					objects.forEach(o => c.removeChild?.(o.bmp));
				}
			};
		},
	},
	{
		id: 'deep-container',
		label: 'Deep Container',
		defaultCount: 100,
		minCount: 50,
		maxCount: 2000,
		build(container: unknown, count: number, factory?: SceneFactory): () => void {
			const c = container as any;
			const maxDepth = 10;
			const branchFactor = Math.max(2, Math.ceil(Math.pow(count, 1 / maxDepth)));
			const allChildren: unknown[] = [];

			function buildTree(parent: unknown, depth: number): void {
				if (depth >= maxDepth) {
					let bmp: any;
					if (factory) {
						bmp = factory.createBitmap(0);
						factory.addChild(parent, bmp);
					} else {
						const p = parent as any;
						bmp = p._createBitmap?.() ?? { x: 0, y: 0 };
						p.addChild?.(bmp);
					}
					allChildren.push(bmp);
					return;
				}
				for (let i = 0; i < branchFactor; i++) {
					let child: any;
					if (factory) {
						child = factory.createSprite();
						(child as any).x = i * 10;
						(child as any).y = depth * 5;
						factory.addChild(parent, child);
					} else {
						const p = parent as any;
						child = p._createSprite?.() ?? { x: 0, y: 0, addChild: undefined };
						child.x = i * 10;
						child.y = depth * 5;
						p.addChild?.(child);
					}
					allChildren.push(child);
					buildTree(child, depth + 1);
				}
			}

			buildTree(container, 0);

			return () => {
				// Remove only direct $children of the root container; nested cleanup cascades
				if (factory) {
					// Remove the top-level sprites added to container
					for (let i = 0; i < branchFactor; i++) {
						if (allChildren[i] !== undefined) {
							factory.removeChild(container, allChildren[i]);
						}
					}
				} else {
					for (let i = 0; i < branchFactor; i++) {
						if (allChildren[i] !== undefined) {
							c.removeChild?.(allChildren[i]);
						}
					}
				}
			};
		},
	},
];

export function getScene(id: string): SceneDescriptor | undefined {
	return scenes.find(s => s.id === id);
}
