/**
 * Kurot game project template.
 *
 * Builds a responsive interface with @kurot/ui and plays tween animations with @kurot/game.
 *
 * Lifecycle: constructor → ADDED_TO_STAGE → $onAddToStage → runGame → load → createGameScene → startAnimation
 */
import { createPlayer, Event, resource, TextField } from '@kurot/core';
import { Button, Label, Rect, Theme, UILayer, setAssetAdapter } from '@kurot/ui';
import { Tween } from '@kurot/game';
import { AssetAdapter } from '@/AssetAdapter';
import { LifecycleHandler } from '@/LifecycleHandler';
import { Preloader } from '@/Preloader';
import { LocaleManager } from '@/LocaleManager';
import { StyleManager } from '@/StyleManager';

class Main extends UILayer {
	private readonly _preloader = new Preloader();
	private _description!: Label;

	createChildren(): void {
		super.createChildren();

		const stage = this.stage;
		if (!stage) return;

		setAssetAdapter(new AssetAdapter());
		LifecycleHandler.init(stage);

		void this._runGame().catch(error => {
			console.error('[Main] Unable to start game:', error);
		});
	}

	private async _runGame(): Promise<void> {
		await this._createPreloader();
		await this._load();
		this._preloader.destroy();
		this._createGameScene();
		this._startAnimation();
	}

	private async _load(): Promise<void> {
		await this._updatePreloader('Loading resource configuration...', 1, 2);
		await resource.loadConfig('resource/default.res.json', 'resource/');

		await this._updatePreloader('Loading theme...', 2, 2);
		await this._loadTheme();

		if (resource.hasGroup('preload')) {
			this._preloader.updateText('Loading resources...');
			await resource.loadGroup('preload', 0, (loaded, total) => {
				this._preloader.onProgress(loaded, total);
			});
		}

		// 翻译依赖 preload 中的文本资源；加载完毕后再创建业务界面。
		LocaleManager.init(
			resource.get('locale_json'),
			name => resource.get(name),
			new URLSearchParams(window.location.search).get('lang') ?? '',
		);
	}

	private async _createPreloader(): Promise<void> {
		await this._preloader.init();
		this.addChild(this._preloader);
	}

	private async _updatePreloader(message: string, current: number, total: number): Promise<void> {
		this._preloader.updateText(message);
		this._preloader.updateProgress(current, total);
		await this._wait(0.1);
	}

	private async _loadTheme(): Promise<void> {
		// Load the theme and its default UI skin mappings.
		const theme = new Theme('resource/default.thm.json');
		await new Promise<void>(resolve => theme.addEventListener(Event.COMPLETE, () => resolve()));
	}

	private _wait(timeout: number): Promise<void> {
		return new Promise<void>(resolve => {
			setTimeout(resolve, timeout * 1000);
		});
	}

	/**
	 * Create the game scene.
	 *
	 * Build a responsive view with Kurot UI components and constraint-based layout.
	 */
	private _createGameScene(): void {
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
		colorLabel.text = LocaleManager.getString('label.title');
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
		this._description = textfield;

		// UI button using the default theme
		const button = new Button();
		button.label = LocaleManager.getString('label.button');
		button.horizontalCenter = 0;
		button.top = 200;
		button.width = 200;
		this.addChild(button);
	}

	/**
	 * Play a looping text fade animation.
	 */
	private _startAnimation(): void {
		const texts = [
			LocaleManager.getString('label.description.open_source'),
			LocaleManager.getString('label.description.push_forward'),
			LocaleManager.getString('label.description.engine'),
		];
		let count = -1;
		const change = () => {
			count++;
			if (count >= texts.length) {
				count = 0;
			}
			this._description.text = texts[count];
			const tw = Tween.get(this._description);
			tw.to({ alpha: 1 }, 200);
			tw.wait(2000);
			tw.to({ alpha: 0 }, 200);
			tw.call(change, this);
		};
		change();
	}
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
async function start(): Promise<void> {
	// 包括 Preloader 在内的所有 Label 首次测量都使用已就绪的项目字体。
	await StyleManager.init();
	TextField.default_fontFamily = StyleManager.fontFamily;
	const canvas = document.getElementById('gameCanvas');
	if (!(canvas instanceof HTMLCanvasElement)) {
		throw new Error('Missing gameCanvas.');
	}
	const app = createPlayer({
		canvas,
		contentWidth: 640,
		contentHeight: 1136,
		scaleMode: 'showAll',
		frameRate: 60,
	});
	app.start(new Main());
}

void start().catch(error => {
	console.error('[Main] Unable to start project:', error);
});
