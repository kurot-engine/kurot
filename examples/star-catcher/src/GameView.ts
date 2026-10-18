import { Shape, Sprite, TextField } from '@kurot/core';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_HALF_WIDTH, PLAYER_Y } from './GameModel.js';
import type { GameSnapshot } from './GameModel.js';

function label(text: string, x: number, y: number, size: number, color: number): TextField {
	const field = new TextField();
	field.text = text;
	field.x = x;
	field.y = y;
	field.size = size;
	field.textColor = color;
	field.fontFamily = 'Arial';
	field.verticalAlign = 'top';
	field.multiline = false;
	field.touchEnabled = false;
	return field;
}

function panel(x: number, y: number, width: number, height: number, color: number): Shape {
	const shape = new Shape();
	shape.graphics.beginFill(color);
	shape.graphics.drawRoundRect(x, y, width, height, 24);
	shape.graphics.endFill();
	return shape;
}

export class GameView extends Sprite {
	private readonly _star = new Shape();
	private readonly _basket = new Sprite();
	private readonly _score = label('00', 42, 74, 40, 0xf5c96c);
	private readonly _lives = label('3', 522, 74, 40, 0xf3eee3);
	private readonly _overlay = new Sprite();
	private readonly _heading = label('', 64, 323, 34, 0xf3eee3);
	private readonly _message = label('', 64, 377, 20, 0xb8c4c2);

	public constructor() {
		super();
		const background = panel(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x102e35);
		background.touchEnabled = true;
		this.addChild(background);
		this.addChild(label('STAR CATCHER', 42, 28, 20, 0x9bbab8));
		this.addChild(label('SCORE', 42, 57, 11, 0x9bbab8));
		this.addChild(label('CHANCES', 492, 57, 11, 0x9bbab8));
		this.addChild(this._score);
		this.addChild(this._lives);
		this.addChild(panel(28, 146, 584, 608, 0x153a40));
		for (let i = 0; i < 28; i++) {
			const dot = new Shape();
			dot.graphics.beginFill(0x71978f, 0.28);
			dot.graphics.drawCircle(56 + (i * 137) % 530, 180 + (i * 79) % 504, i % 3 === 0 ? 2 : 1);
			dot.graphics.endFill();
			this.addChild(dot);
		}
		this._star.graphics.beginFill(0xf5c96c);
		for (let i = 0; i < 10; i++) {
			const angle = -Math.PI / 2 + i * Math.PI / 5;
			const radius = i % 2 === 0 ? 20 : 9;
			const x = Math.cos(angle) * radius;
			const y = Math.sin(angle) * radius;
			if (i === 0) {
				this._star.graphics.moveTo(x, y);
			} else {
				this._star.graphics.lineTo(x, y);
			}
		}
		this._star.graphics.lineTo(0, -20);
		this._star.graphics.endFill();
		this.addChild(this._star);
		this._basket.addChild(panel(-PLAYER_HALF_WIDTH, 0, PLAYER_HALF_WIDTH * 2, 22, 0x92d5b1));
		this._basket.addChild(panel(-PLAYER_HALF_WIDTH + 8, 22, PLAYER_HALF_WIDTH * 2 - 16, 8, 0x519e83));
		this._basket.y = PLAYER_Y;
		this.addChild(this._basket);
		this.addChild(label('←  MOVE TO CATCH  →', 202, 769, 14, 0x9bbab8));
		this._overlay.addChild(panel(40, 278, 560, 190, 0x0b252d));
		this._heading.width = 512;
		this._heading.textAlign = 'center';
		this._message.width = 512;
		this._message.textAlign = 'center';
		this._overlay.addChild(this._heading);
		this._overlay.addChild(this._message);
		this.addChild(this._overlay);
	}

	public render(state: GameSnapshot): void {
		this._score.text = String(state.score).padStart(2, '0');
		this._lives.text = String(state.lives);
		this._basket.x = state.playerX;
		this._star.x = state.starX;
		this._star.y = state.starY;
		this._star.rotation = (state.starY - 168) / 6;
		this._star.visible = state.phase === 'playing' || state.phase === 'paused';
		this._overlay.visible = state.phase !== 'playing';
		const messages = {
			ready: ['A little focus. A sky of stars.', 'Press Start below. Catch a star for 10 points.'],
			paused: ['Take a breath.', 'Press Resume when you’re ready.'],
			ended: ['A good catch.', `You collected ${state.score} points. Try another round?`],
			disposed: ['See you next time.', 'Reload the page to play again.'],
			playing: ['', ''],
		};
		[this._heading.text, this._message.text] = messages[state.phase];
	}
}
