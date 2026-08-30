import type { UIDocument, UIPropertyValue } from '@kurot/ui-document';
import { createDataController } from './createDataController.js';
import { registerSemanticActions } from './registerSemanticActions.js';
import type { KurotUICreationContext } from '../types.js';

/**
 * Activates the dynamic Contract owned by one fully materialized asset tree.
 */
export function activateRuntimeContract(
	document: UIDocument,
	scope: string,
	context: KurotUICreationContext,
	initialData: Readonly<Record<string, UIPropertyValue>> = {},
): void {
	const controller = createDataController(
		document.contract,
		document.id,
		scope,
		context,
		initialData,
	);
	context.dataControllers.set(scope, controller);
	registerSemanticActions(document, scope, context);
}
