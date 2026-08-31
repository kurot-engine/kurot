import type { UIAssetContract, UIPropertyOverride } from '@kurot/ui-document';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';
import { qualifyNodeId } from '../node-identity.js';
import {
	applyPropertyUpdates,
	attachCause,
	restorePropertyBackups,
} from '../propertyTransaction.js';
import type {
	RuntimePropertyBackup,
	RuntimePropertyUpdate,
} from '../propertyTransaction.js';
import type {
	KurotUICreationContext,
	KurotUIStateController,
} from '../types.js';

/**
 * Creates a state controller over one fully initialized reusable instance.
 */
export function createReusableComponentStateController(
	contract: UIAssetContract,
	scope: string,
	contractPath: string,
	context: KurotUICreationContext,
): KurotUIStateController {
	const states = Object.keys(contract.states).sort();
	let currentState: string | undefined;
	let backups: RuntimePropertyBackup[] = [];

	return {
		get currentState(): string | undefined {
			return currentState;
		},
		states: Object.freeze(states),
		setState(name: string): void {
			const definition = contract.states[name];
			if (!definition) {
				throw new KurotUIRuntimeError(
					'unknown-state',
					`Reusable component state "${name}" is not declared.`,
					`${contractPath}.states`,
				);
			}
			if (currentState === name) return;
			const previousState = currentState;
			const previousDefinition = previousState
				? contract.states[previousState]
				: undefined;
			restorePropertyBackups(backups);
			backups = [];
			currentState = undefined;
			try {
				backups = applyStateOverrides(
					definition.overrides,
					scope,
					`${contractPath}.states.${name}`,
					context,
				);
				currentState = name;
			} catch (error) {
				if (previousState && previousDefinition) {
					try {
						backups = applyStateOverrides(
							previousDefinition.overrides,
							scope,
							`${contractPath}.states.${previousState}`,
							context,
						);
						currentState = previousState;
					} catch (recoveryError) {
						// Keep the original failure observable; the instance stays stateless.
						attachCause(error, recoveryError);
						backups = [];
					}
				}
				throw error;
			}
		},
		clearState(): void {
			if (currentState === undefined) return;
			restorePropertyBackups(backups);
			backups = [];
			currentState = undefined;
		},
	};
}

function applyStateOverrides(
	overrides: readonly UIPropertyOverride[],
	scope: string,
	path: string,
	context: KurotUICreationContext,
): RuntimePropertyBackup[] {
	const updates: RuntimePropertyUpdate[] = [];
	for (let index = 0; index < overrides.length; index++) {
		const override = overrides[index];
		const identity = qualifyNodeId(scope, override.targetId);
		const target = context.instances.get(identity);
		const type = context.types.get(identity);
		if (!target || !type) continue;
		updates.push({
			path: `${path}.overrides[${index}].value`,
			property: override.property,
			target,
			type,
			value: override.value,
		});
	}
	return applyPropertyUpdates(updates, context);
}
