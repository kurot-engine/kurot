import * as kurot from '../../src/index.js';

declare global {
	interface Window {
		bitmapFill: {
			bitmap: kurot.Bitmap;
			root: kurot.Sprite;
			player: kurot.Player;
			kurot: typeof kurot;
			configure(trimmed: boolean, rotated: boolean): void;
			compare(): number;
		};
	}
}

const canvas = document.querySelector('canvas');
if (!canvas) throw new Error('Missing bitmap fill canvas.');
const params = new URLSearchParams(location.search);
if (params.get('backend') === 'canvas') canvas.getContext('2d');
const resolution = Number(params.get('resolution') ?? 1);
canvas.width = 100 * resolution;
canvas.height = 80 * resolution;
kurot.Capabilities._init();
const player = new kurot.Player(canvas);
player.updateStageSize(100, 80, canvas.width, canvas.height);
const root = new kurot.Sprite();
player.stage.addChild(root);
const bitmap = new kurot.Bitmap();
bitmap.x = 9;
bitmap.y = 11;
bitmap.width = 37;
bitmap.height = 29;
bitmap.smoothing = false;
root.addChild(bitmap);

const tile = document.createElement('canvas');
tile.width = 8;
tile.height = 6;
const atlas = document.createElement('canvas');
atlas.width = atlas.height = 32;

function configure(trimmed: boolean, rotated: boolean): void {
	const tileContext = tile.getContext('2d')!;
	tileContext.clearRect(0, 0, 8, 6);
	const left = trimmed ? 2 : 0;
	const top = trimmed ? 1 : 0;
	const width = trimmed ? 4 : 8;
	const height = trimmed ? 3 : 6;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			tileContext.fillStyle = `rgb(${x * 20 + 80},${y * 30 + 90},${(x + y) * 10 + 100})`;
			tileContext.fillRect(left + x, top + y, 1, 1);
		}
	}
	const context = atlas.getContext('2d')!;
	context.fillStyle = '#ff00ff';
	context.fillRect(0, 0, 32, 32);
	context.save();
	if (rotated) {
		context.translate(10 + height, 12);
		context.rotate(Math.PI / 2);
	} else {
		context.translate(10, 12);
	}
	context.drawImage(tile, left, top, width, height, 0, 0, width, height);
	context.restore();
	const texture = new kurot.Texture();
	texture.bitmapData = new kurot.BitmapData(atlas);
	texture.initData(10, 12, width, height, left, top, 8, 6, 32, 32, rotated);
	bitmap.texture = texture;
}

function compare(): number {
	player.render(false, 0);
	const capture = document.createElement('canvas');
	capture.width = canvas!.width;
	capture.height = canvas!.height;
	const actual = capture.getContext('2d')!;
	actual.drawImage(canvas!, 0, 0);
	const pixels = actual.getImageData(0, 0, capture.width, capture.height).data;
	const expected = document.createElement('canvas');
	expected.width = capture.width;
	expected.height = capture.height;
	const context = expected.getContext('2d')!;
	context.imageSmoothingEnabled = false;
	context.scale(resolution, resolution);
	context.translate(bitmap.x, bitmap.y);
	if (bitmap.fillMode === 'scale') {
		context.drawImage(tile, 0, 0, bitmap.width, bitmap.height);
	} else {
		context.beginPath();
		context.rect(0, 0, bitmap.width, bitmap.height);
		context.clip();
		if (bitmap.fillMode === 'clip') {
			context.drawImage(tile, 0, 0);
		} else {
			context.fillStyle = context.createPattern(tile, 'repeat')!;
			context.fillRect(0, 0, bitmap.width, bitmap.height);
		}
	}
	const reference = context.getImageData(0, 0, expected.width, expected.height).data;
	const red = (bitmap.tint >> 16) & 255;
	const green = (bitmap.tint >> 8) & 255;
	const blue = bitmap.tint & 255;
	for (let i = 0; i < reference.length; i += 4) {
		reference[i] = (reference[i] * red) / 255;
		reference[i + 1] = (reference[i + 1] * green) / 255;
		reference[i + 2] = (reference[i + 2] * blue) / 255;
	}
	let mismatch = 0;
	for (let i = 0; i < pixels.length; i += 4) {
		if (
			pixels[i + 3] !== reference[i + 3] ||
			(pixels[i + 3] > 0 &&
				Math.max(
					Math.abs(pixels[i] - reference[i]),
					Math.abs(pixels[i + 1] - reference[i + 1]),
					Math.abs(pixels[i + 2] - reference[i + 2]),
				) > 2)
		) {
			mismatch++;
		}
	}
	return mismatch;
}

window.bitmapFill = { bitmap, root, player, kurot, configure, compare };
