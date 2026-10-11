import { Capabilities, Player, Sprite, TextField } from '@kurot/core';
import { Label } from '../../dist/index.js';

declare global {
	interface Window {
		multilineFit: {
			label: Label;
			field: TextField;
			player: Player;
			paint(): void;
			paintAlignmentGrid(fitting: boolean): void;
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
const density = Number(new URLSearchParams(location.search).get('density') ?? 1);
player.updateStageSize(320, 160, 320 * density, 160 * density);
const root = new Sprite();
player.stage.addChild(root);
const label = new Label('Доказуемая честность');
label.x = 20;
label.y = 20;
label.width = 120;
label.height = 44;
label.size = 30;
label.minFontSize = 14;
label.wordWrap = true;
label.lineSpacing = 2;
label.stroke = 1;
label.verticalAlign = 'middle';
label.textFit = 'shrink';
root.addChild(label);
label.validateNow();
const field = label.getChildAt(0);
if (!(field instanceof TextField)) throw new Error('Label must own a native TextField.');
const alignmentLabels: Label[] = [];
window.multilineFit = {
	label,
	field,
	player,
	paint(): void {
		label.validateNow();
		player.render(false, 0);
	},
	paintAlignmentGrid(fitting: boolean): void {
		if (alignmentLabels.length === 0) {
			root.removeChildren();
			for (const [row, vertical] of ['top', 'middle', 'bottom'].entries()) {
				for (const [column, horizontal] of ['left', 'center', 'right'].entries()) {
					const caption = new Label('BET\nA');
					caption.x = 5 + column * 105;
					caption.y = 3 + row * 44;
					caption.width = 90;
					caption.height = 40;
					caption.size = 14;
					caption.stroke = 1;
					caption.textAlign = horizontal;
					caption.verticalAlign = vertical;
					root.addChild(caption);
					alignmentLabels.push(caption);
				}
			}
			for (const [column, bounds] of ['width', 'height', 'maximums'].entries()) {
				const caption = new Label('BET');
				caption.x = 5 + column * 105;
				caption.y = 138;
				caption.size = 14;
				caption.stroke = 1;
				caption.textAlign = 'center';
				caption.verticalAlign = 'middle';
				if (bounds === 'width') {
					caption.width = 90;
				} else if (bounds === 'height') {
					caption.height = 22;
				} else {
					caption.maxWidth = 90;
					caption.maxHeight = 22;
				}
				root.addChild(caption);
				alignmentLabels.push(caption);
			}
		}
		for (const caption of alignmentLabels) {
			caption.textFit = fitting ? 'shrink' : 'none';
			caption.validateNow();
			if (caption.renderedSize !== 14 || caption.textFitOverflow) {
				throw new Error('Alignment captions must retain their base size without overflow.');
			}
		}
		player.render(false, 0);
	},
};
window.multilineFit.paint();
