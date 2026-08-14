/**
 * Loads theme configuration data for {@link Theme}.
 */
export interface IThemeAdapter {
	/**
	 * Loads a theme URL and reports either its data or the loading error.
	 */
	getTheme(url: string, onSuccess: (data: unknown) => void, onError: (err: unknown) => void): void;
}
