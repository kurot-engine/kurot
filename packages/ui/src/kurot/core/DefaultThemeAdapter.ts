import type { IThemeAdapter } from './IThemeAdapter.js';

/**
 * Loads theme configuration files with `fetch`.
 */
export class DefaultThemeAdapter implements IThemeAdapter {
	// ── Public methods ────────────────────────────────────────────────────

	public getTheme(url: string, onSuccess: (data: unknown) => void, onError: (err: unknown) => void): void {
		fetch(url)
			.then((response): unknown => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.text();
			})
			.then((text: unknown): void => {
				try {
					const data = JSON.parse(text as string);
					onSuccess(data);
				} catch (_e) {
					onSuccess(text);
				}
			})
			.catch((err: unknown): void => {
				onError(err);
			});
	}
}
