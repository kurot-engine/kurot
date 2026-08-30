import type { UIResourceReference } from '@kurot/ui-document';
import type { KurotUIResourceAdapters } from '../types.js';

/**
 * Creates complete resource-category adapters with stable-key defaults.
 */
export function createKurotUIResourceAdapters(
	overrides: Partial<KurotUIResourceAdapters> = {},
): KurotUIResourceAdapters {
	return Object.freeze({
		animation: overrides.animation ?? resolveResourceKey,
		font: overrides.font ?? resolveResourceKey,
		image: overrides.image ?? resolveResourceKey,
		spine: overrides.spine ?? resolveResourceKey,
		'sprite-frame': overrides['sprite-frame'] ?? resolveResourceKey,
	});
}

function resolveResourceKey(reference: UIResourceReference): string {
	return reference.key;
}
