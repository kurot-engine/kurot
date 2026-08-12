export class DebugLog {
	private static _enabled = false;
	private static _frameCount = 0;
	private static _maxFrames = 3;

	public static enable(): void {
		DebugLog._enabled = true;
		DebugLog._frameCount = 0;
	}

	public static get active(): boolean {
		if (!DebugLog._enabled) return false;
		return DebugLog._frameCount < DebugLog._maxFrames;
	}

	public static tickFrame(): void {
		if (DebugLog._enabled) {
			DebugLog._frameCount++;
			if (DebugLog._frameCount >= DebugLog._maxFrames) {
				DebugLog._enabled = false;
			}
		}
	}
}

// Expose to window for test page
(globalThis as Record<string, unknown>).DebugLog = DebugLog;
