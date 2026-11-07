import { BackdropBlur, createPlayer, Shape, Sprite, TextField, ticker } from '../../src/index.js';

const backend = new URLSearchParams(location.search).get('backend') ?? 'webgl2';
if (backend === 'webgl1') {
	const original = HTMLCanvasElement.prototype.getContext;
	HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
		return type === 'webgl2' ? null : original.call(this, type, ...args);
	} as typeof original;
}
const canvas = document.querySelector('canvas')!;
if (backend === 'canvas') {
	canvas.getContext('2d');
}
const app = createPlayer({ canvas, contentWidth: 960, contentHeight: 540, scaleMode: 'showAll' });
const root = new Sprite();
const background = new Sprite();
root.addChild(background);
background.addChild(box(0x10243b, 960, 540));
for (let y = 50; y < 540; y += 50) {
	const line = box(0x284762, 960, 1);
	line.y = y;
	background.addChild(line);
}
for (let x = 30; x < 960; x += 64) {
	const line = box(0x284762, 1, 540);
	line.x = x;
	background.addChild(line);
}
const orbs: Shape[] = [];
for (let index = 0; index < 16; index++) {
	const orb = new Shape();
	orb.graphics.beginFill([0x60a5fa, 0x34d399, 0xfbbf24, 0xf472b6][index % 4]);
	orb.graphics.drawCircle(0, 0, 14 + index % 4 * 7);
	orb.graphics.endFill();
	background.addChild(orb);
	orbs.push(orb);
}
background.addChild(label('STAR HARBOR', 36, 35, 30));
background.addChild(label('LIVE WORLD  /  DYNAMIC SCENE', 36, 78, 13, 0x67e8f9));
for (let index = 0; index < 6; index++) {
	background.addChild(label(`SECTOR 0${index + 1}  ───  ACTIVE`, 55 + index % 3 * 310, 210 + Math.floor(index / 3) * 150, 17));
}

const effect = new BackdropBlur({ width: 480, height: 330, blurX: 12, blurY: 12, quality: 2 });
effect.x = 402;
effect.y = 116;
root.addChild(effect);
const panel = modal('发现新的星域', '背景持续更新，当前弹窗保持清晰。', 480, 330);
panel.x = effect.x;
panel.y = effect.y;
root.addChild(panel);
const secondEffect = new BackdropBlur({ width: 390, height: 220, blurX: 16, blurY: 16, quality: 2 });
secondEffect.x = 510;
secondEffect.y = 246;
const secondPanel = modal('第二层弹窗', '它会模糊后方的第一层弹窗。', 390, 220);
secondPanel.x = secondEffect.x;
secondPanel.y = secondEffect.y;
const status = document.querySelector<HTMLElement>('#status')!;
status.textContent = `${app.player.isWebGL ? backend === 'webgl1' ? 'WebGL 1' : 'WebGL 2' : 'Canvas 2D'} · 原生 BackdropBlur · ${app.screenAdapter.resolution}×`;

document.querySelector<HTMLInputElement>('#blur')!.addEventListener('input', event => {
	const radius = Number((event.currentTarget as HTMLInputElement).value);
	effect.blurX = effect.blurY = radius;
	document.querySelector('output')!.textContent = String(radius);
});
document.querySelector<HTMLInputElement>('#alpha')!.addEventListener('input', event => {
	effect.alpha = Number((event.currentTarget as HTMLInputElement).value);
});
document.querySelector<HTMLButtonElement>('#toggle')!.addEventListener('click', event => {
	if (effect.parent) {
		root.removeChild(effect);
	} else {
		root.addChildAt(effect, root.getChildIndex(panel));
	}
	(event.currentTarget as HTMLButtonElement).textContent = effect.parent ? '移除模糊层' : '恢复模糊层';
});
document.querySelector<HTMLButtonElement>('#stack')!.addEventListener('click', event => {
	if (secondEffect.parent) {
		root.removeChild(secondEffect);
		root.removeChild(secondPanel);
	} else {
		root.addChild(secondEffect);
		root.addChild(secondPanel);
	}
	(event.currentTarget as HTMLButtonElement).textContent = secondEffect.parent ? '关闭第二个弹窗' : '叠加第二个弹窗';
});
let moving = true;
document.querySelector<HTMLButtonElement>('#motion')!.addEventListener('click', event => {
	moving = !moving;
	(event.currentTarget as HTMLButtonElement).textContent = moving ? '暂停背景动画' : '继续背景动画';
});
let elapsed = 0;
const animate = (time: number): boolean => {
	if (moving) {
		elapsed = time;
	}
	for (const [index, orb] of orbs.entries()) {
		orb.x = 480 + Math.sin(elapsed / 2400 + index * 2.1) * 420;
		orb.y = 290 + Math.cos(elapsed / 1900 + index * 1.7) * 190;
	}
	return false;
};
ticker.startTick(animate);
app.start(root);
window.addEventListener('pagehide', () => {
	ticker.stopTick(animate);
	app.destroy();
}, { once: true });

function box(color: number, width: number, height: number, alpha = 1): Shape {
	const shape = new Shape();
	shape.graphics.beginFill(color, alpha);
	shape.graphics.drawRect(0, 0, width, height);
	shape.graphics.endFill();
	return shape;
}

function label(text: string, x: number, y: number, size: number, color = 0xf1f5f9): TextField {
	const field = new TextField();
	field.text = text;
	field.x = x;
	field.y = y;
	field.size = size;
	field.textColor = color;
	field.fontFamily = 'system-ui, sans-serif';
	return field;
}

function modal(title: string, description: string, width: number, height: number): Sprite {
	const panel = new Sprite();
	panel.addChild(box(0x0f172a, width, height, 0.58));
	panel.graphics.lineStyle(1, 0x94a3b8, 0.45);
	panel.graphics.drawRect(0, 0, width, height);
	panel.addChild(label('EXPLORE  /  模态前景', 30, 26, 12, 0x67e8f9));
	panel.addChild(label(title, 30, 67, 28));
	panel.addChild(label(description, 30, 115, 15, 0xcbd5e1));
	const button = box(0x60a5fa, 150, 42);
	button.x = 30;
	button.y = height - 70;
	panel.addChild(button);
	panel.addChild(label('保持清晰  →', 48, height - 61, 16, 0x0b1020));
	return panel;
}
