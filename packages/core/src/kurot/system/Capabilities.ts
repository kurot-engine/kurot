/**
 * Provides read-only information about the runtime environment.
 * Values are populated once by `Capabilities._init()` (called from
 * `createPlayer`) and updated by `ScreenAdapter` on resize.
 *
 * Equivalent to Egret's `egret.Capabilities`, Web-only simplified version.
 */
export class Capabilities {
	// ── Static fields ─────────────────────────────────────────────────────────

	/** System language code, e.g. "zh-CN", "en-US". */
	public static language: string = 'en';

	/**
	 * Operating system name.
	 * One of: "iOS" | "Android" | "Windows Phone" | "Windows PC" | "Mac OS" | "Unknown"
	 */
	public static os: string = 'Unknown';

	/** Whether the application is running on a mobile device. */
	public static isMobile: boolean = false;

	/**
	 * Current render mode, set by Player after WebGL initialisation.
	 * One of: "webgl" | "canvas"
	 */
	public static $renderMode: string = 'unknown';

	/** Blakron engine version, injected at build time via package.json. */
	public static readonly engineVersion: string = '0.2.4';

	/**
	 * Width of the canvas bounding client rect in CSS pixels.
	 * Updated by ScreenAdapter on every resize.
	 */
	public static boundingClientWidth: number = 0;

	/**
	 * Height of the canvas bounding client rect in CSS pixels.
	 * Updated by ScreenAdapter on every resize.
	 */
	public static boundingClientHeight: number = 0;

	// ── Internal init ─────────────────────────────────────────────────────────

	/**
	 * Detects environment capabilities from the browser UA and navigator APIs.
	 * Called once by `createPlayer` before the player starts.
	 *
	 * Strategy (per MDN + Client Hints spec):
	 * 1. `navigator.userAgentData.mobile` — Client Hints API, most accurate,
	 *    Chromium-only as of 2025 (not available in Safari / Firefox).
	 * 2. UA regex fallback — covers Safari, Firefox, and older browsers.
	 */
	public static _init(): void {
		const ua = navigator.userAgent;
		const uaLower = ua.toLowerCase();

		// ── isMobile ──────────────────────────────────────────────────────────
		// Prefer the Client Hints API when available (Chromium, HTTPS only).
		// Fall back to UA regex for Safari / Firefox.
		const uaData = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData;
		if (uaData !== undefined) {
			this.isMobile = uaData.mobile;
		} else {
			this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
		}

		// ── os ────────────────────────────────────────────────────────────────
		if (this.isMobile) {
			// iPad on iOS 13+ requests desktop site by default — UA looks like
			// macOS but maxTouchPoints > 1 gives it away.
			const isIpad = navigator.maxTouchPoints > 1 && uaLower.includes('mac os');
			if (isIpad || uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod')) {
				this.os = 'iOS';
				this.isMobile = true;
			} else if (uaLower.includes('android')) {
				this.os = 'Android';
			} else if (uaLower.includes('windows')) {
				this.os = 'Windows Phone';
			} else {
				this.os = 'Unknown';
			}
		} else {
			if (uaLower.includes('windows nt')) {
				this.os = 'Windows PC';
			} else if (uaLower.includes('mac os')) {
				this.os = 'Mac OS';
			} else {
				this.os = 'Unknown';
			}
		}

		// ── language ──────────────────────────────────────────────────────────
		const raw = navigator.language ?? 'en';
		const parts = raw.split('-');
		if (parts.length > 1) {
			this.language = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
		} else {
			this.language = raw.toLowerCase();
		}
	}
}
