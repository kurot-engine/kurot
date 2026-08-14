/**
 * Kurot game project template.
 *
 * Builds a responsive interface with @kurot/ui and plays tween animations with @kurot/game.
 *
 * Lifecycle: constructor → ADDED_TO_STAGE → $onAddToStage → runGame → load → createGameScene → startAnimation
 */
import { createPlayer, Event, resource } from '@kurot/core';
import { Button, Label, Rect, Theme, UILayer, setAssetAdapter } from '@kurot/ui';
import { Tween } from '@kurot/game';
import { AssetAdapter } from '@/AssetAdapter';
import { LifecycleHandler } from '@/LifecycleHandler';
import { Preloader } from '@/Preloader';

class Main extends UILayer {
	private readonly _preloader = new Preloader();

	createChildren(): void {
		super.createChildren();

		const stage = this.stage;
		if (!stage) return;

		setAssetAdapter(new AssetAdapter());
		LifecycleHandler.init(stage);

		void this.runGame().catch(error => {
			console.error('[Main] Unable to start game:', error);
		});
	}

	private async runGame(): Promise<void> {
		await this.createPreloader();
		await this.load();
		this._preloader.destroy();
		this.createGameScene();
		this.startAnimation();
	}

	private async load(): Promise<void> {
		await this.updatePreloader('Loading resource configuration...', 1, 2);
		await resource.loadConfig('resource/default.res.json', 'resource/');

		await this.updatePreloader('Loading theme...', 2, 2);
		await this.loadTheme();

		if (resource.hasGroup('preload')) {
			this._preloader.updateText('Loading resources...');
			await resource.loadGroup('preload', 0, (loaded, total) => {
				this._preloader.onProgress(loaded, total);
			});
		}
	}

	private async createPreloader(): Promise<void> {
		await this._preloader.init();
		this.addChild(this._preloader);
	}

	private async updatePreloader(message: string, current: number, total: number): Promise<void> {
		this._preloader.updateText(message);
		this._preloader.updateProgress(current, total);
		await this.wait(0.1);
	}

	private async loadTheme(): Promise<void> {
		// Load the theme and its default UI skin mappings.
		const theme = new Theme('resource/default.thm.json');
		await new Promise<void>(resolve => theme.addEventListener(Event.COMPLETE, () => resolve()));
	}

	private wait(timeout: number): Promise<void> {
		return new Promise<void>(resolve => {
			setTimeout(resolve, timeout * 1000);
		});
	}

	private textfield!: Label;

	/**
	 * Create the game scene.
	 *
	 * Build a responsive view with EUI components and constraint-based layout.
	 */
	private createGameScene(): void {
		// Responsive background
		const sky = new Rect();
		sky.left = 0;
		sky.right = 0;
		sky.top = 0;
		sky.bottom = 0;
		sky.fillColor = 0x2d3436;
		this.addChild(sky);

		// Translucent header
		const topMask = new Rect();
		topMask.left = 0;
		topMask.right = 0;
		topMask.top = 33;
		topMask.height = 172;
		topMask.fillColor = 0x000000;
		topMask.fillAlpha = 0.5;
		this.addChild(topMask);

		// Title
		const colorLabel = new Label();
		colorLabel.textColor = 0xffffff;
		colorLabel.left = 0;
		colorLabel.right = 0;
		colorLabel.top = 80;
		colorLabel.height = 48;
		colorLabel.textAlign = 'center';
		colorLabel.verticalAlign = 'middle';
		colorLabel.text = 'Hello Kurot';
		colorLabel.size = 36;
		this.addChild(colorLabel);

		// Animated description
		const textfield = new Label();
		this.addChild(textfield);
		textfield.alpha = 0;
		textfield.left = 0;
		textfield.right = 0;
		textfield.top = 135;
		textfield.height = 36;
		textfield.textAlign = 'center';
		textfield.verticalAlign = 'middle';
		textfield.size = 24;
		textfield.textColor = 0xffffff;
		this.textfield = textfield;

		// UI button using the default theme
		const button = new Button();
		button.label = 'Click Me';
		button.horizontalCenter = 0;
		button.top = 200;
		button.width = 200;
		this.addChild(button);
	}

	/**
	 * Play a looping text fade animation.
	 */
	private startAnimation(): void {
		const texts = ['Open-source, Free, Multi-platform', 'Push Game Forward', 'HTML5 Game Engine'];
		let count = -1;
		const change = () => {
			count++;
			if (count >= texts.length) {
				count = 0;
			}
			this.textfield.text = texts[count];
			const tw = Tween.get(this.textfield);
			tw.to({ alpha: 1 }, 200);
			tw.wait(2000);
			tw.to({ alpha: 0 }, 200);
			tw.call(change, this);
		};
		change();
	}
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
const app = createPlayer({
	canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
	contentWidth: 640,
	contentHeight: 1136,
	scaleMode: 'showAll',
	frameRate: 60,
});

app.start(new Main());
