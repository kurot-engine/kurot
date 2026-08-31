import { Event, TouchEvent } from '@kurot/core';
import type { UIDocument, UISemanticActionTrigger } from '@kurot/ui-document';
import { qualifyNodeId } from '../node-identity.js';
import type { KurotUICreationContext } from '../types.js';

/**
 * Connects one asset's bounded action declarations to runtime events.
 */
export function registerSemanticActions(
	asset: UIDocument,
	scope: string,
	context: KurotUICreationContext,
): void {
	const onAction = context.onAction;
	if (onAction === undefined) {
		return;
	}
	const actions = asset.contract.actions ?? {};
	for (const name of Object.keys(actions).sort()) {
		const definition = actions[name]!;
		const identity = qualifyNodeId(scope, definition.sourceId);
		const source = context.instances.get(identity);
		if (source === undefined) {
			continue;
		}
		const eventType = getEventType(definition.trigger);
		const listener = (event: Event): void => {
			onAction({
				action: name,
				assetId: asset.id,
				event,
				scope,
				sourceId: definition.sourceId,
			});
		};
		source.addEventListener(eventType, listener);
		context.disposeCallbacks.push((): void => {
			source.removeEventListener(eventType, listener);
		});
	}
}

function getEventType(trigger: UISemanticActionTrigger): string {
	switch (trigger) {
		case 'change':
			return Event.CHANGE;
		case 'tap':
			return TouchEvent.TOUCH_TAP;
	}
}
