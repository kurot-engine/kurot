import { Event, type Stage } from '@kurot/core';

/**
 * Manages application-specific foreground and background behavior.
 *
 * Kurot pauses and resumes its ticker automatically. Add project-level
 * behavior such as music, network, or worker handling to this class.
 */
export class LifecycleHandler {

	private static _stage?: Stage;

	static init(stage: Stage): void {
		if (this._stage === stage) return;

		this.clear();
		this._stage = stage;
		this._stage.addEventListener(Event.DEACTIVATE, this.onPause);
		this._stage.addEventListener(Event.ACTIVATE, this.onResume);
	}

	static clear(): void {
		if (!this._stage) return;

		this._stage.removeEventListener(Event.DEACTIVATE, this.onPause);
		this._stage.removeEventListener(Event.ACTIVATE, this.onResume);
		this._stage = undefined;
	}

	private static onPause = (): void => {
		// Add application-specific background behavior here.
		console.log('paused');
	};

	private static onResume = (): void => {
		// Add application-specific foreground behavior here.
		console.log('resumed');
	};
}
