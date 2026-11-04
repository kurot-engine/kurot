/**
 * Native components whose conventional Skin names establish a default mapping.
 */
export const BUILTIN_SKIN_HOSTS: ReadonlySet<string> = new Set([
	'Button', 'CheckBox', 'ComboBox', 'HScrollBar', 'HSlider', 'ItemRenderer',
	'Panel', 'ProgressBar', 'RadioButton', 'Scroller', 'TextInput', 'ToggleButton',
	'ToggleSwitch', 'VScrollBar', 'VSlider',
]);

/**
 * Returns the native host of a conventional qualified Skin name.
 */
export function builtinSkinHost(skinName: string): string | undefined {
	const shortName = skinName.split('.').pop();
	if (!shortName?.endsWith('Skin')) {
		return undefined;
	}
	const name = shortName.slice(0, -4);
	return BUILTIN_SKIN_HOSTS.has(name) ? name : undefined;
}
