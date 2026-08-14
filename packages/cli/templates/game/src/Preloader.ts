import { Group, Label, Rect, UILayer } from '@kurot/ui';

/**
 * Displays project startup and resource-loading progress.
 */
export class Preloader extends UILayer {

	private readonly _background = new Rect();
	private readonly _title = new Label();
	private readonly _tip = new Label();
	private readonly _progress = new Group();
	private readonly _track = new Rect();
	private readonly _thumb = new Rect();
	private readonly _thumbMask = new Rect();

	init(): Promise<void> {
		this.createBackground();
		this.createTitle();
		this.createProgress();
		this.createTip();
		return Promise.resolve();
	}

	onProgress(current: number, total: number): void {
		if (total <= 0) return;
		const width = this.getMaskMaxWidth();
		this._thumbMask.width = width * 0.7 + width * 0.3 * (current / total);
	}

	updateProgress(current: number, total: number): void {
		if (total <= 0) return;
		this._thumbMask.width = this.getMaskMaxWidth() * 0.7 * current / total;
	}

	updateText(text: string): void {
		this._tip.text = text;
	}

	destroy(): void {
		if (this.parent) {
			this.parent.removeChild(this);
		}
	}

	private createBackground(): void {
		this.addChild(this._background);
		this._background.left = 0;
		this._background.right = 0;
		this._background.top = 0;
		this._background.bottom = 0;
		this._background.fillColor = 0x2d3436;
	}

	private createTitle(): void {
		this.addChild(this._title);
		this._title.text = 'KUROT';
		this._title.size = 48;
		this._title.bold = true;
		this._title.width = 400;
		this._title.height = 64;
		this._title.textAlign = 'center';
		this._title.verticalAlign = 'middle';
		this._title.horizontalCenter = 0;
		this._title.verticalCenter = -80;
	}

	private createProgress(): void {
		this.addChild(this._progress);
		this._progress.width = 520;
		this._progress.height = 24;
		this._progress.horizontalCenter = 0;
		this._progress.verticalCenter = 10;

		this._progress.addChild(this._track);
		this._track.left = 0;
		this._track.right = 0;
		this._track.top = 0;
		this._track.bottom = 0;
		this._track.fillColor = 0xffffff;

		this._progress.addChild(this._thumb);
		this._thumb.left = 4;
		this._thumb.right = 4;
		this._thumb.top = 4;
		this._thumb.bottom = 4;
		this._thumb.fillColor = 0x00a8ff;

		this._progress.addChild(this._thumbMask);
		this._thumbMask.left = 4;
		this._thumbMask.top = 4;
		this._thumbMask.bottom = 4;
		this._thumbMask.width = 0;
		this._thumb.mask = this._thumbMask;
	}

	private createTip(): void {
		this.addChild(this._tip);
		this._tip.text = 'Starting...';
		this._tip.size = 20;
		this._tip.width = 520;
		this._tip.height = 40;
		this._tip.textAlign = 'center';
		this._tip.verticalAlign = 'middle';
		this._tip.horizontalCenter = 0;
		this._tip.verticalCenter = 60;
	}

	private getMaskMaxWidth(): number {
		const inset = Number(this._thumbMask.left) || 0;
		return this._progress.width - inset * 2;
	}
}
