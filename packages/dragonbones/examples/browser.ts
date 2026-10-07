import { BitmapData, CanvasBuffer, CanvasRenderer, Matrix, Mesh, Sprite, Texture, createPlayer } from '@kurot/core';
import { KurotFactory } from '../src/index.js';
import { makeAtlas, makeSkeleton } from '../test/fixtures.js';

const canvas = document.querySelector<HTMLCanvasElement>('#webgl');
const fallbackHost = document.querySelector('#fallback');
const status = document.querySelector('#status');
if (!canvas || !fallbackHost || !status) throw new Error('Example elements are missing.');
const app = createPlayer({ canvas, contentWidth: 640, contentHeight: 360, resolution: 1, frameRate: 60 });
const root = new Sprite();
const fallback = new CanvasBuffer(640, 360);
const fallbackRenderer = new CanvasRenderer();
fallbackHost.appendChild(fallback.surface);
const factories: KurotFactory[] = [];
const textures: Texture[] = [];
const page = document.createElement('canvas');
page.width = page.height = 128;
const context = page.getContext('2d');
if (!context) throw new Error('Cannot create fixture atlas.');
for (const [x, y, color] of [
	[0, 0, '#ffd24a'],
	[8, 0, '#ef5363'],
	[0, 12, '#50dba5'],
	[8, 12, '#5f91ff'],
] as const) {
	context.fillStyle = color;
	context.fillRect(10 + x, 20 + y, 8, 12);
}
for (const [x, y, color] of [
	[0, 0, '#ffd24a'],
	[6, 0, '#ef5363'],
	[0, 4, '#50dba5'],
	[6, 4, '#5f91ff'],
] as const) {
	context.save();
	context.translate(58, 20);
	context.rotate(Math.PI / 2);
	context.fillStyle = color;
	context.fillRect(x, y, 6, 4);
	context.restore();
}
context.fillStyle = '#50dba5';
context.fillRect(0, 64, 16, 16);
const atlasPage = new Texture();
atlasPage.setBitmapData(new BitmapData(page));
textures.push(atlasPage);

const cases = [{}, { texture: 'rotated' }, { texture: 'trimmed' }, { mesh: true }, { mesh: true, weighted: true }, { nested: true }];
cases.forEach((options, index) => {
	const factory = new KurotFactory({ autoUpdate: false });
	factories.push(factory);
	factory.parseSkeleton(makeSkeleton(options));
	factory.parseAtlas(makeAtlas(), atlasPage);
	const display = factory.buildArmatureDisplay('main');
	if (!display) throw new Error('Cannot build example.');
	display.x = 30 + index * 100;
	display.y = 12;
	display.scaleX = display.scaleY = 3;
	if (options.mesh) {
		const slot = display.armature.getSlot('slot');
		if (slot?._displayFrame) {
			slot._displayFrame.deformVertices.splice(0, 8, 8, 5, 0, 0, -4, 0, 0, 0);
			slot._verticesDirty = true;
		}
	}
	root.addChild(display);
});

let uiLoaded = false;
const metadata = (await fetch('/sample').then(response => response.json())) as { available: boolean; prefix?: string };
if (metadata.available && metadata.prefix) {
	const prefix = metadata.prefix;
	const [skeleton, atlas] = await Promise.all([
		fetch(`/assets/${prefix}_ske.dbbin`).then(response => response.arrayBuffer()),
		fetch(`/assets/${prefix}_tex.json`).then(response => response.json()) as Promise<unknown>,
	]);
	const image = new Image();
	image.src = `/assets/${prefix}_tex.png`;
	await image.decode();
	const texture = new Texture();
	texture.setBitmapData(new BitmapData(image));
	textures.push(texture);
	const factory = new KurotFactory({ autoUpdate: false });
	factories.push(factory);
	const data = factory.parseSkeleton(skeleton);
	factory.parseAtlas(atlas, texture);
	const display = factory.buildArmatureDisplay(data.armatureNames[0]);
	if (!display) throw new Error('Cannot build project UI armature.');
	display.x = 320;
	display.y = 240;
	display.scaleX = display.scaleY = 0.6;
	display.animation.play();
	root.addChild(display);
	uiLoaded = true;
}

let paused = false;
let frames = 0;
let previous = performance.now();
app.start(root);
function render(time: number): void {
	if (!paused) {
		for (const factory of factories) {
			factory.advanceTime(Math.max(0, Math.min((time - previous) / 1000, 0.05)));
		}
	}
	previous = time;
	app.player.render(true, 0);
	fallback.clear();
	fallbackRenderer.render(root, fallback, new Matrix());
	frames++;
	requestAnimationFrame(render);
}
requestAnimationFrame(render);
status.textContent = `${app.player.isWebGL ? 'WebGL' : 'Canvas fallback'} / Canvas 2D — ready${uiLoaded ? ' + project UI' : ''}`;

function readPixels(): { webgl: number[]; canvas: number[] } {
	app.player.render(true, 0);
	fallback.clear();
	fallbackRenderer.render(root, fallback, new Matrix());
	const capture = new CanvasBuffer(640, 360);
	capture.context.drawImage(canvas!, 0, 0);
	const points = [
		[42, 45],
		[63, 45],
		[42, 80],
		[63, 80],
		[146, 65],
		[166, 65],
		[146, 78],
		[166, 78],
	];
	return {
		webgl: points.flatMap(([x, y]) => capture.getPixels(x, y)),
		canvas: points.flatMap(([x, y]) => fallback.getPixels(x, y)),
	};
}

declare global {
	interface Window {
		dragonBonesExample: {
			info(): { ready: boolean; webgl: boolean; uiLoaded: boolean; frames: number; displays: number; vertices: number[] };
			pause(): void;
			pixels(): ReturnType<typeof readPixels>;
			dispose(): void;
		};
	}
}
window.dragonBonesExample = {
	info: () => ({
		ready: true,
		webgl: app.player.isWebGL,
		uiLoaded,
		frames,
		displays: factories.reduce((sum, factory) => sum + factory.displayCount, 0),
		vertices: root.getChildAt(3) instanceof Sprite ? [...((root.getChildAt(3) as Sprite).getChildAt(0) as Mesh).vertices] : [],
	}),
	pause: () => {
		paused = true;
	},
	pixels: readPixels,
	dispose: () => {
		paused = true;
		for (const factory of factories) {
			factory.dispose();
		}
		for (const texture of textures) {
			texture.dispose();
		}
	},
};
window.addEventListener(
	'pagehide',
	() => {
		window.dragonBonesExample.dispose();
		app.destroy();
	},
	{ once: true },
);
