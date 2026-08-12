/**
 * Adapter interface for loading theme configuration files.
 * Implement this and pass it to `Theme` constructor to customize how .thm.js files are fetched.
 */
export interface IThemeAdapter {
	/**
	 * Fetch and return the theme config data.
	 * @param url       Path to the theme file (e.g. "resource/default.thm.js")
	 * @param onSuccess Called with the parsed theme data on success.
	 * @param onError   Called on failure.
	 */
	getTheme(url: string, onSuccess: (data: unknown) => void, onError: (err: unknown) => void): void;
}
