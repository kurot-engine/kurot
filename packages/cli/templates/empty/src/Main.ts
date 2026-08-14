/**
 * Kurot empty project template.
 *
 * A minimal entry point that depends only on @kurot/core and contains no UI components.
 * Suitable for Canvas rendering, custom drawing, and animation experiments.
 *
 * Lifecycle: constructor → ADDED_TO_STAGE → $onAddToStage
 */
import { createPlayer, Sprite, Event } from '@kurot/core';

class Main extends Sprite {
	public constructor() {
		super();
		this.addEventListener(Event.ADDED_TO_STAGE, this.onAddedToStage);
	}

	private onAddedToStage(_event: Event): void {
		// Add your game logic here.
		console.log('Kurot game started');
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
