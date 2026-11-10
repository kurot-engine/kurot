import { CanvasRenderer, Capabilities, Player, TextField, WebGLRenderContext } from '@kurot/core';
import { Group, Label, RichLabel } from '../../dist/index.js';

interface TextSample {
	width: number;
	height: number;
	groupWidth: number;
	lines: number;
	size: number;
	renderedSize: number;
	overflow: boolean;
}

declare global {
	interface Window {
		textAutoWidth: {
			groups: Group[];
			labels: [Label, RichLabel, Label];
			webgl: boolean;
			paint(): { samples: TextSample[]; image: string; stable: boolean };
			setText(text: string): void;
			resetTextureStats(): void;
			textureStats(): { rasters: number; uploads: number };
		};
	}
}

const canvas = document.querySelector('canvas');
if (!canvas) {
	throw new Error('Missing text auto-width canvas.');
}
if (new URLSearchParams(location.search).get('backend') === 'canvas') {
	canvas.getContext('2d');
}
Capabilities._init();
const player = new Player(canvas);
player.updateStageSize(360, 220, 360, 220);
const root = new Group();
root.width = 360;
root.height = 220;
player.stage.addChild(root);
const labels: [Label, RichLabel, Label] = [new Label(), new RichLabel(), new Label()];
const groups: Group[] = [];
const counts = [0, 0, 0];
for (const [index, label] of labels.entries()) {
	label.size = 16;
	label.fontFamily = 'Arial';
	label.textColor = 0xffffff;
	label.left = label.right = 10;
	const group = new Group();
	group.x = 10;
	group.y = 15 + index * 65;
	group.addChild(label);
	root.addChild(group);
	groups.push(group);
	const measure = label.measure.bind(label);
	label.measure = (): void => {
		if (++counts[index] > 500) {
			throw new Error('Text auto-width layout did not converge.');
		}
		measure();
	};
}
labels[2].maxWidth = 120;
labels[2].multiline = false;
labels[2].textFit = 'shrink';
labels[2].minFontSize = 12;

let rasters = 0;
let uploads = 0;
const raster = CanvasRenderer.prototype.renderTextFieldToContext;
CanvasRenderer.prototype.renderTextFieldToContext = function (...args) {
	rasters++;
	return raster.apply(this, args);
};
const create = WebGLRenderContext.prototype.createTexture;
WebGLRenderContext.prototype.createTexture = function (...args) {
	uploads++;
	return create.apply(this, args);
};
const update = WebGLRenderContext.prototype.updateTexture;
WebGLRenderContext.prototype.updateTexture = function (...args) {
	uploads++;
	return update.apply(this, args);
};

window.textAutoWidth = {
	groups,
	labels,
	webgl: player.isWebGL,
	resetTextureStats(): void {
		rasters = uploads = 0;
	},
	textureStats(): { rasters: number; uploads: number } {
		return { rasters, uploads };
	},
	setText(text): void {
		labels[0].text = text;
		labels[1].textFlow = [{ text: text.slice(0, 2), style: { textColor: 0xffaa33 } }, { text: text.slice(2) }];
		labels[2].text = text;
	},
	paint(): { samples: TextSample[]; image: string; stable: boolean } {
		root.validateNow();
		player.render(false, 0);
		const before = counts.join(',');
		for (let pass = 0; pass < 8; pass++) {
			root.validateNow();
		}
		const samples = labels.map((label, index) => {
			const field = label.getChildAt(0);
			if (!(field instanceof TextField)) {
				throw new Error('Expected a native TextField.');
			}
			return {
				width: label.width,
				height: label.height,
				groupWidth: groups[index].width,
				lines: field.numLines,
				size: label.size,
				renderedSize: label instanceof Label ? label.renderedSize : label.size,
				overflow: label instanceof Label ? label.textFitOverflow : false,
			};
		});
		return { samples, image: canvas.toDataURL(), stable: before === counts.join(',') };
	},
};
