import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { BitmapData, Mesh, Texture } from '@kurot/core';
import { KurotFactory, dragonBones } from '../src/index.js';
import type { KurotArmatureDisplay } from '../src/index.js';

async function findSkeletons(directory: string): Promise<string[]> {
	const result: string[] = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			result.push(...(await findSkeletons(path)));
		} else if (entry.name.endsWith('_ske.dbbin')) {
			result.push(path);
		}
	}
	return result.sort();
}

function checkDisplay(display: KurotArmatureDisplay): number {
	let meshes = 0;
	for (const slot of display.armature.getSlots()) {
		const native: unknown = slot.display;
		if (native instanceof Mesh && native.texture) {
			meshes++;
			const values = [...native.vertices, ...native.uvs, ...Object.values(native.matrix)];
			if (values.some(value => typeof value === 'number' && !Number.isFinite(value))) {
				throw new Error(`Non-finite geometry: ${slot.name}`);
			}
			if (native.indices.some(index => index < 0 || index * 2 >= native.vertices.length)) {
				throw new Error(`Invalid mesh index: ${slot.name}`);
			}
		}
		if (slot.childArmature) {
			meshes += checkDisplay(slot.childArmature.display as KurotArmatureDisplay);
		}
	}
	return meshes;
}

const directory = process.argv[2];
if (!directory) throw new Error('Usage: pnpm verify:project <directory-containing-DragonBones-assets>');
const paths = await findSkeletons(resolve(directory));
if (paths.length === 0) throw new Error('No *_ske.dbbin files found.');
const factory = new KurotFactory({ autoUpdate: false });
const report = { skeletons: 0, armatures: 0, animations: 0, samples: 0, meshSamples: 0, events: 0, weightedSlots: 0, deformableSlots: 0 };
try {
	for (const path of paths) {
		const prefix = path.slice(0, -'_ske.dbbin'.length);
		const bytes = await readFile(path);
		const binary = new Uint8Array(bytes).buffer;
		const atlas: unknown = JSON.parse(await readFile(`${prefix}_tex.json`, 'utf8'));
		const png = await readFile(`${prefix}_tex.png`);
		const page = new Texture();
		page.setBitmapData(new BitmapData({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) } as HTMLCanvasElement));
		const data = factory.parseSkeleton(binary, path);
		factory.parseAtlas(atlas, page, path);
		report.skeletons++;
		for (const name of data.armatureNames) {
			const display = factory.buildArmatureDisplay(name, path, '', path);
			if (!display) throw new Error(`Cannot build ${path}: ${name}`);
			report.armatures++;
			for (const slot of display.armature.getSlots()) {
				if (slot._geometryData?.weight) {
					report.weightedSlots++;
				} else if (slot._geometryData) {
					report.deformableSlots++;
				}
			}
			for (const type of [dragonBones.EventObject.COMPLETE, dragonBones.EventObject.FRAME_EVENT]) {
				display.addDBEventListener(type, () => {
					report.events++;
				});
			}
			for (const clip of display.animation.animationNames) {
				const animation = display.animation.animations[clip];
				display.animation.reset();
				display.animation.play(clip, 1);
				report.animations++;
				const steps = Math.max(12, Math.ceil(animation.duration * 60));
				for (let frame = 0; frame <= steps; frame++) {
					factory.advanceTime((animation.duration + 1 / 60) / steps);
					report.meshSamples += checkDisplay(display);
					report.samples++;
				}
			}
			display.dispose();
			if (factory.displayCount !== 0 || display.numChildren !== 0) throw new Error(`Display not released: ${path}`);
		}
		factory.clear();
		factory.advanceTime(0);
		if (!page.bitmapData) throw new Error(`Borrowed atlas was disposed: ${path}`);
		page.dispose();
	}
} finally {
	factory.dispose();
}
console.log(JSON.stringify(report, undefined, 2));
