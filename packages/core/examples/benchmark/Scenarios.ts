import { createSeededRandom } from './runtime/BenchmarkProtocol.js';
import type { BenchmarkAdapter } from './BenchmarkAdapter.js';

export interface ScenarioRuntime {
	update(frame: number): void;
	destroy(): void;
}

export interface ScenarioDefinition {
	readonly id: string;
	readonly label: string;
	readonly version: number;
	readonly defaultCount: number;
	readonly minCount: number;
	readonly maxCount: number;
	build(adapter: BenchmarkAdapter, count: number, seed: number): ScenarioRuntime;
}

interface MovingNode {
	node: object;
	phase: number;
	speed: number;
	radiusX: number;
	radiusY: number;
}

export const scenarios: readonly ScenarioDefinition[] = [
	makeStaticSpriteScenario('sprite-batch', 'Sprite Batch (1 Texture)', 1),
	makeStaticSpriteScenario('mixed-texture', 'Mixed Texture (8 Textures)', 8),
	{
		id: 'dynamic-transform',
		label: 'Dynamic Transform',
		version: 1,
		defaultCount: 300,
		minCount: 50,
		maxCount: 5000,
		build(adapter, count, seed) {
			const random = createSeededRandom(seed);
			const holder = adapter.createContainer();
			adapter.addChild(adapter.root, holder);
			const nodes: MovingNode[] = [];
			for (let i = 0; i < count; i++) {
				const node = adapter.createSprite(0);
				adapter.addChild(holder, node);
				nodes.push({
					node,
					phase: random() * Math.PI * 2,
					speed: 0.02 + random() * 0.03,
					radiusX: 100 + random() * 250,
					radiusY: 80 + random() * 180,
				});
			}
			return {
				update(frame) {
					for (const moving of nodes) {
						moving.phase += moving.speed;
						adapter.setPosition(
							moving.node,
							400 + Math.cos(moving.phase) * moving.radiusX,
							300 + Math.sin(moving.phase) * moving.radiusY,
						);
						adapter.setRotation(moving.node, frame * 1.5);
						adapter.setAlpha(moving.node, 0.5 + Math.sin(moving.phase * 2) * 0.5);
					}
				},
				destroy() {
					adapter.removeChild(adapter.root, holder);
				},
			};
		},
	},
	{
		id: 'deep-container',
		label: 'Deep Container',
		version: 1,
		defaultCount: 500,
		minCount: 50,
		maxCount: 5000,
		build(adapter, count, seed) {
			const random = createSeededRandom(seed);
			const root = adapter.createContainer();
			adapter.addChild(adapter.root, root);
			const parents: object[] = [root];
			let parent = root;
			for (let depth = 1; depth < 10; depth++) {
				const child = adapter.createContainer();
				adapter.setPosition(child, depth * 2, depth * 2);
				adapter.addChild(parent, child);
				parents.push(child);
				parent = child;
			}
			for (let i = 0; i < count; i++) {
				const node = adapter.createSprite(i % 8);
				adapter.setPosition(node, random() * 760, random() * 560);
				adapter.addChild(parents[i % parents.length], node);
			}
			return makeStaticRuntime(adapter, root);
		},
	},
	{
		id: 'rapid-churn',
		label: 'Rapid Add/Remove',
		version: 1,
		defaultCount: 500,
		minCount: 50,
		maxCount: 3000,
		build(adapter, count, seed) {
			const random = createSeededRandom(seed);
			const holder = adapter.createContainer();
			adapter.addChild(adapter.root, holder);
			const nodes: object[] = [];
			for (let i = 0; i < count; i++) {
				const node = adapter.createSprite(i % 8);
				adapter.setPosition(node, random() * 760, random() * 560);
				adapter.addChild(holder, node);
				nodes.push(node);
			}
			const churnCount = Math.max(1, Math.floor(count * 0.02));
			return {
				update(frame) {
					for (let i = 0; i < churnCount; i++) {
						const removed = nodes.shift();
						if (removed) {
							adapter.removeChild(holder, removed);
						}
						const node = adapter.createSprite((frame + i) % 8);
						adapter.setPosition(node, random() * 760, random() * 560);
						adapter.addChild(holder, node);
						nodes.push(node);
					}
				},
				destroy() {
					adapter.removeChild(adapter.root, holder);
				},
			};
		},
	},
	{
		id: 'texture-swap',
		label: 'Texture Swap',
		version: 1,
		defaultCount: 500,
		minCount: 50,
		maxCount: 3000,
		build(adapter, count, seed) {
			const random = createSeededRandom(seed);
			const holder = adapter.createContainer();
			adapter.addChild(adapter.root, holder);
			const nodes: object[] = [];
			for (let i = 0; i < count; i++) {
				const node = adapter.createSprite(i % 8);
				adapter.setPosition(node, random() * 760, random() * 560);
				adapter.addChild(holder, node);
				nodes.push(node);
			}
			return {
				update(frame) {
					for (let i = 0; i < nodes.length; i++) {
						if ((i + frame) % 3 === 0) {
							adapter.setTexture(nodes[i], (i + frame) % 8);
						}
					}
				},
				destroy() {
					adapter.removeChild(adapter.root, holder);
				},
			};
		},
	},
	{
		id: 'filter-heavy',
		label: 'Filter Heavy',
		version: 1,
		defaultCount: 50,
		minCount: 10,
		maxCount: 200,
		build(adapter, count, seed) {
			const random = createSeededRandom(seed);
			const holder = adapter.createContainer();
			adapter.addChild(adapter.root, holder);
			for (let i = 0; i < count; i++) {
				const node = adapter.createFilteredRect(Math.floor(random() * 0xffffff), i);
				adapter.setPosition(node, (i % 10) * 75 + 10, Math.floor(i / 10) * 75 + 10);
				adapter.addChild(holder, node);
			}
			return makeStaticRuntime(adapter, holder);
		},
	},
];

export function getScenario(id: string): ScenarioDefinition | undefined {
	return scenarios.find(scenario => scenario.id === id);
}

function makeStaticSpriteScenario(id: string, label: string, textureCount: number): ScenarioDefinition {
	return {
		id,
		label,
		version: 1,
		defaultCount: 500,
		minCount: 50,
		maxCount: 5000,
		build(adapter, count, seed) {
			const random = createSeededRandom(seed);
			const holder = adapter.createContainer();
			adapter.addChild(adapter.root, holder);
			for (let i = 0; i < count; i++) {
				const node = adapter.createSprite(i % textureCount);
				adapter.setPosition(node, random() * 760, random() * 560);
				adapter.addChild(holder, node);
			}
			return makeStaticRuntime(adapter, holder);
		},
	};
}

function makeStaticRuntime(adapter: BenchmarkAdapter, holder: object): ScenarioRuntime {
	return {
		update() {},
		destroy() {
			adapter.removeChild(adapter.root, holder);
		},
	};
}
