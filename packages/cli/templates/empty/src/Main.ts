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
const canvas = document.getElementById('gameCanvas');
if (!(canvas instanceof HTMLCanvasElement)) {
	throw new Error('Missing gameCanvas.');
}
const app = createPlayer({ canvas });

app.start(new Main());
