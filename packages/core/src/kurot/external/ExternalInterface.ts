declare global {
	interface Window {
		[key: string]: unknown;
		__blakronCallback?: (name: string, value: string) => void;
	}
}

const _callbacks = new Map<string, (value: string) => void>();

export const ExternalInterface = {
	/**
	 * Calls a function registered on the host page via `window[functionName]`.
	 */
	call(functionName: string, value: string): void {
		const fn = window[functionName];
		if (typeof fn === 'function') {
			(fn as (v: string) => void)(value);
		}
	},

	/**
	 * Registers a callback that can be invoked from the host page via
	 * `window.__blakronCallback(functionName, value)`.
	 */
	addCallback(functionName: string, listener: (value: string) => void): void {
		_callbacks.set(functionName, listener);
		window.__blakronCallback = (name, value) => {
			_callbacks.get(name)?.(value);
		};
	},
};
