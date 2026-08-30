import { Event, TouchEvent } from '@kurot/core';
import type { UIDocument, UISemanticActionTrigger } from '@kurot/ui-document';
import { qualifyNodeId } from '../materializeNode.js';
import type { KurotUICreationContext } from '../types.js';

/**
 * Connects one asset's bounded action declarations to runtime events.
 */
export function registerSemanticActions(
	document: UIDocument,
	scope: string,
	context: KurotUICreationContext,
): void {
	if (context.onAction === undefined) {
		return;
	}
	const actions = document.contract.actions ?? {};
	for (const name of Object.keys(actions).sort()) {
		const definition = actions[name]!;
		const identity = qualifyNodeId(scope, definition.sourceId);
		const source = context.instances.get(identity);
		if (source === undefined) {
			continue;
		}
		const eventType = getEventType(definition.trigger);
		const listener = (event: Event): void => {
			context.onAction?.({
				action: name,
				assetId: document.id,
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
