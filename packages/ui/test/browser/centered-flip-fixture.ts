import { BitmapData, Capabilities, Player, Rectangle, Sprite, Texture } from '@kurot/core';
import { BasicLayout, Group, Image } from '../../dist/index.js';

interface FlipFixture {
	paint(flipX: boolean, flipY: boolean): { colors: number[][][]; frames: number[][]; hits: boolean[] };
	resize(): number[][][];
	moveChild(): number[];
}

declare global {
	interface Window {
		centeredFlips: FlipFixture;
	}
}

const canvas = document.querySelector('canvas');
if (!canvas) throw new Error('Missing test canvas.');
if (new URLSearchParams(location.search).get('backend') === 'canvas') {
	canvas.getContext('2d');
}
Capabilities._init();
const player = new Player(canvas);
player.updateStageSize(640, 360);
const root = new Sprite();
player.stage.addChild(root);

const source = document.createElement('canvas');
source.width = 40;
source.height = 20;
const sourceContext = source.getContext('2d');
if (!sourceContext) throw new Error('Missing source context.');
sourceContext.fillStyle = '#ff0000';
sourceContext.fillRect(0, 0, 20, 10);
sourceContext.fillStyle = '#00ff00';
sourceContext.fillRect(20, 0, 20, 10);
sourceContext.fillStyle = '#0000ff';
sourceContext.fillRect(0, 10, 20, 10);
sourceContext.fillStyle = '#ffff00';
sourceContext.fillRect(20, 10, 20, 10);
const texture = new Texture();
texture.setBitmapData(new BitmapData(source));

const groups: Group[] = [];
const images: Image[] = [];
for (let index = 0; index < 5; index++) {
	const group = new Group();
	group.x = 20 + index * 120;
	group.y = 20;
	group.width = 80;
	group.height = 40;
	group.layout = new BasicLayout();
	root.addChild(group);
	const image = new Image(texture);
	image.percentWidth = 100;
	image.percentHeight = 100;
	image.left = 0;
	image.top = 0;
	image.anchorOffsetX = 13;
	image.anchorOffsetY = 7;
	image.smoothing = false;
	group.addChild(image);
	group.validateNow();
	if (index === 1) group.cacheAsBitmap = true;
	if (index === 2) group.isRenderGroup = true;
	if (index === 3) image.cacheAsBitmap = true;
	if (index === 4) image.scrollRect = new Rectangle(0, 0, 80, 40);
	groups.push(group);
	images.push(image);
}

const mirroredParent = new Group();
mirroredParent.x = 20;
mirroredParent.y = 100;
mirroredParent.width = 100;
mirroredParent.height = 40;
root.addChild(mirroredParent);
const sparseImage = new Image(texture);
sparseImage.width = 40;
sparseImage.height = 20;
sparseImage.x = 10;
sparseImage.y = 5;
mirroredParent.addChild(sparseImage);
mirroredParent.validateNow();

const movingParent = new Sprite();
movingParent.x = 20;
movingParent.y = 200;
movingParent.flipX = true;
movingParent.isRenderGroup = true;
root.addChild(movingParent);
const first = new Image(texture);
first.width = 40;
first.height = 20;
const moving = new Image(texture);
moving.width = 40;
moving.height = 20;
moving.x = 60;
movingParent.addChild(first);
movingParent.addChild(moving);
first.validateNow();
moving.validateNow();

function pixels(): Uint8ClampedArray {
	player.render(false, 0);
	if (player.isWebGL) {
		const gl = canvas!.getContext('webgl2') ?? canvas!.getContext('webgl');
		if (!gl) throw new Error('Missing WebGL test context.');
		const raw = new Uint8Array(canvas!.width * canvas!.height * 4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.readPixels(0, 0, canvas!.width, canvas!.height, gl.RGBA, gl.UNSIGNED_BYTE, raw);
		const result = new Uint8ClampedArray(raw.length);
		const stride = canvas!.width * 4;
		for (let row = 0; row < canvas!.height; row++) {
			result.set(raw.subarray(row * stride, (row + 1) * stride), (canvas!.height - row - 1) * stride);
		}
		return result;
	}
	const snapshot = document.createElement('canvas');
	snapshot.width = canvas.width;
	snapshot.height = canvas.height;
	const context = snapshot.getContext('2d');
	if (!context) throw new Error('Missing snapshot context.');
	context.drawImage(canvas, 0, 0);
	return context.getImageData(0, 0, snapshot.width, snapshot.height).data;
}

function colorAt(data: Uint8ClampedArray, x: number, y: number): number[] {
	const index = (y * 640 + x) * 4;
	return Array.from(data.slice(index, index + 4));
}

function colors(data: Uint8ClampedArray): number[][][] {
	return groups.map(group => [
		colorAt(data, group.x + 5, 25),
		colorAt(data, group.x + group.width - 5, 25),
		colorAt(data, group.x + 5, 55),
		colorAt(data, group.x + group.width - 5, 55),
	]);
}

window.centeredFlips = {
	paint(flipX: boolean, flipY: boolean): ReturnType<FlipFixture['paint']> {
		for (const image of images) {
			image.flipX = flipX;
			image.flipY = flipY;
		}
		mirroredParent.flipX = flipX;
		mirroredParent.flipY = flipY;
		const data = pixels();
		const frame = new Rectangle();
		const frames = images.map(image => {
			image.getLayoutBounds(frame);
			return [frame.x, frame.y, frame.width, frame.height];
		});
		const hits = images.map(image => {
			const point = image.localToGlobal(5, 5);
			return image.hitTestPoint(point.x, point.y) && image.$hitTest(point.x, point.y) === image;
		});
		const sparsePoint = sparseImage.localToGlobal(5, 5);
		return {
			colors: [...colors(data), [colorAt(data, Math.floor(sparsePoint.x), Math.floor(sparsePoint.y))]],
			frames,
			hits,
		};
	},
	resize(): number[][][] {
		for (const group of groups) {
			group.width = 100;
			group.validateNow();
		}
		images[4]!.scrollRect = new Rectangle(0, 0, 100, 40);
		return colors(pixels());
	},
	moveChild(): number[] {
		pixels();
		moving.x = 100;
		const data = pixels();
		return colorAt(data, 125, 205);
	},
};
