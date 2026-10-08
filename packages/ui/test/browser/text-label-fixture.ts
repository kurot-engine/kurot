import { BitmapData, BitmapFont, Capabilities, Player, Sprite, TextField, Texture } from '@kurot/core';
import { BitmapLabel, RichLabel } from '../../dist/index.js';

declare global {
	interface Window {
		textLabels: {
			rich: RichLabel;
			bitmap: BitmapLabel;
			field: TextField;
			player: Player;
			paint(): number[];
		};
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

const rich = new RichLabel([
	{ text: 'BOLD ', style: { size: 24, bold: true, textColor: 0xff0000 } },
	{ text: 'ITALIC ', style: { size: 24, italic: true, textColor: 0x00ff00 } },
	{ text: 'Normal\n', style: { size: 24, textColor: 0xffffff } },
	{ text: 'abcdefghij', style: { size: 18, textColor: 0x3399ff } },
]);
rich.x = 20;
rich.y = 20;
rich.maxWidth = 220;
root.addChild(rich);

const fontPage = document.createElement('canvas');
fontPage.width = 32;
fontPage.height = 32;
const fontContext = fontPage.getContext('2d');
if (!fontContext) throw new Error('Missing font page context.');
fontContext.fillStyle = '#ffaa00';
fontContext.fillRect(0, 0, 8, 10);
const texture = new Texture();
texture.setBitmapData(new BitmapData(fontPage));
const font = new BitmapFont(
	texture,
	{
		frames: { A: { x: 0, y: 0, w: 8, h: 10, sourceW: 10, sourceH: 12 } },
	},
	{ ownsTexture: false },
);

const bitmap = new BitmapLabel('AAAA');
bitmap.font = font;
bitmap.maxWidth = 20;
bitmap.x = 20;
bitmap.y = 200;
root.addChild(bitmap);

rich.validateNow();
bitmap.validateNow();
const field = rich.getChildAt(0);
if (!(field instanceof TextField)) throw new Error('RichLabel must own one native TextField.');

window.textLabels = {
	rich,
	bitmap,
	field,
	player,
	paint(): number[] {
		rich.validateNow();
		bitmap.validateNow();
		player.render(false, 0);
		const snapshot = document.createElement('canvas');
		snapshot.width = canvas.width;
		snapshot.height = canvas.height;
		const context = snapshot.getContext('2d');
		if (!context) throw new Error('Missing snapshot context.');
		context.drawImage(canvas, 0, 0);
		return Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data);
	},
};
window.textLabels.paint();
