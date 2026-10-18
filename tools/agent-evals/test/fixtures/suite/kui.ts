import { Event, IOErrorEvent, ticker, TouchEvent } from '@kurot/core';
import { Component, Theme } from '@kurot/ui';
import { makePage } from './common.js';

const page = makePage('KUI Quiz', ['close']);
export const app = page.app;
let disposed = false;
let quiz: Quiz | undefined;
const controls = new AbortController();

export class Quiz extends Component<'QuizSkin'> {
	private _phase = 'ready';
	private _score = 0;
	private _question = 0;
	private readonly _onStart = (): void => { if (this._phase === 'ready') { this.restart(); } };
	private readonly _onLeft = (): void => this.answer('left');
	private readonly _onRight = (): void => this.answer('right');
	private readonly _onRestart = (): void => this.restart();

	public constructor() {
		super(); this.name = 'quiz'; this.width = 640; this.height = 800; this.skinName = 'QuizSkin';
	}

	public restart(): void {
		if (this._phase === 'disposed') return;
		this._phase = 'playing'; this._score = 0; this._question = 0; this.render();
	}

	public dispose(): void {
		if (this._phase === 'disposed') return;
		this._phase = 'disposed'; this.unwire(); this.render();
	}

	protected override onSkinReady(): void {
		super.onSkinReady();
		const p = this.skinParts;
		p.start.addEventListener(TouchEvent.TOUCH_TAP, this._onStart);
		p.left.addEventListener(TouchEvent.TOUCH_TAP, this._onLeft);
		p.right.addEventListener(TouchEvent.TOUCH_TAP, this._onRight);
		p.restart.addEventListener(TouchEvent.TOUCH_TAP, this._onRestart);
		this.render();
	}

	protected override onSkinRemoved(): void { this.unwire(); super.onSkinRemoved(); }

	private answer(side: string): void {
		if (this._phase !== 'playing') return;
		if (side === ['left', 'right', 'left'][this._question]) { this._score += 10; }
		this._question++;
		if (this._question === 3) { this._phase = 'ended'; }
		this.render();
	}

	private unwire(): void {
		const p = this.skinParts;
		p.start.removeEventListener(TouchEvent.TOUCH_TAP, this._onStart);
		p.left.removeEventListener(TouchEvent.TOUCH_TAP, this._onLeft);
		p.right.removeEventListener(TouchEvent.TOUCH_TAP, this._onRight);
		p.restart.removeEventListener(TouchEvent.TOUCH_TAP, this._onRestart);
	}

	private render(): void {
		const p = this.skinParts;
		p.scoreLabel.text = `Score ${this._score}`;
		p.promptLabel.text = this._phase === 'playing' ? `Choose ${['LEFT', 'RIGHT', 'LEFT'][this._question]}` : this._phase;
		p.left.enabled = p.right.enabled = this._phase === 'playing';
		p.start.enabled = this._phase === 'ready'; p.restart.enabled = this._phase !== 'disposed';
		page.mirror(this._phase, this._score, { question: String(this._question) });
	}
}

function dispose(): void {
	if (disposed) return;
	disposed = true; controls.abort(); quiz?.dispose(); page.buttons.close.disabled = true; app.destroy(); ticker.stop();
}

page.buttons.close.addEventListener('click', dispose, { signal: controls.signal });
window.addEventListener('pagehide', dispose, { signal: controls.signal });
page.mirror('loading', 0, { question: '0' });
const theme = new Theme('resource/default.thm.json');
await new Promise<void>((resolve, reject) => {
	theme.addEventListener(Event.COMPLETE, () => resolve());
	theme.addEventListener(IOErrorEvent.IO_ERROR, () => reject(new Error('Theme load failed.')));
});
if (!disposed) { quiz = new Quiz(); page.root.addChild(quiz); }
