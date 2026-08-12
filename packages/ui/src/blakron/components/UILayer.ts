import { Event } from '@blakron/core';
import { Group } from './Group.js';

/**
 * UILayer — a top-level UI container that automatically sizes to the stage.
 *
 * Use as the root of the UI display list. When added to the stage, UILayer
 * listens to RESIZE events and keeps its size synced with the stage dimensions.
 */
export class UILayer extends Group {
	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.addEventListener(Event.ADDED_TO_STAGE, this.$onAddedToStage);
		this.addEventListener(Event.REMOVED_FROM_STAGE, this.$onRemovedFromStage);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private $onAddedToStage(): void {
		const stage = this.stage;
		if (!stage) return;
		stage.addEventListener(Event.RESIZE, this.$onResize);
		this.$onResize();
	}

	private $onRemovedFromStage(): void {
		const stage = this.stage;
		if (stage) {
			stage.removeEventListener(Event.RESIZE, this.$onResize);
		}
	}

	private $onResize(): void {
		const stage = this.stage;
		if (!stage) return;
		this.width = stage.stageWidth;
		this.height = stage.stageHeight;
	}
}
