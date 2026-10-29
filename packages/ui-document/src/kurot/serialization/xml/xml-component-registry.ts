import { createKurotUIFoundationRegistry } from '../../catalog/kurot-ui-foundation.js';
import type { UIComponentRegistry } from '../../schema/UIComponentRegistry.js';

/**
 * Builds codec-only metadata for built-in controls beyond the public foundation.
 * Consumers can still register those controls in their own foundation registry.
 */
export function createXMLComponentRegistry(): UIComponentRegistry {
	const registry = createKurotUIFoundationRegistry();
	for (const type of ['kui.CheckBox', 'kui.ToggleSwitch']) {
		registry.register({ type, extends: 'kui.ToggleButton' });
	}
	registry.register({
		type: 'kui.RadioButton',
		extends: 'kui.ToggleButton',
		properties: { groupName: { valueType: 'string' } },
	});
	return registry;
}
