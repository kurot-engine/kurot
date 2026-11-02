import { Event } from '@kurot/core';
import type { Stage } from '@kurot/core';
import { Group } from './Group.js';

/**
 * UILayer — a top-level UI container that automatically sizes to the stage.
 *
 * Use as the root of the UI display list. When added to the stage, UILayer
 * immediately adopts its logical dimensions and follows subsequent RESIZE events.
 * Removal stops listening; reattachment synchronizes to the current stage again.
 */
export class UILayer extends Group {
	// ── Instance fields ───────────────────────────────────────────────────

	// REMOVED_FROM_STAGE is dispatched after this.stage has been cleared.
	private _resizeStage?: Stage;
	private readonly _onResize = (): void => {
		const stage = this._resizeStage;
		if (!stage) {
			return;
		}
		this.width = stage.stageWidth;
		this.height = stage.stageHeight;
	};

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.addEventListener(Event.ADDED_TO_STAGE, this.$onAddedToStage);
		this.addEventListener(Event.REMOVED_FROM_STAGE, this.$onRemovedFromStage);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private $onAddedToStage(): void {
		const stage = this.stage;
		if (!stage) {
			return;
		}
		this._resizeStage?.removeEventListener(Event.RESIZE, this._onResize);
		this._resizeStage = stage;
		stage.addEventListener(Event.RESIZE, this._onResize);
		this._onResize();
	}

	private $onRemovedFromStage(): void {
		this._resizeStage?.removeEventListener(Event.RESIZE, this._onResize);
		this._resizeStage = undefined;
	}
}
