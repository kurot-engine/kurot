import type { DisplayObject } from '@kurot/core';
import type { UIAssetContract, UIPropertyOverride } from '@kurot/ui-document';
import { applyRuntimeProperty } from '../applyRuntimeProperty.js';
import { KurotUIRuntimeError } from '../KurotUIRuntimeError.js';
import { qualifyNodeId } from '../materializeNode.js';
import type {
	KurotUICreationContext,
	KurotUIStateController,
} from '../types.js';

interface RuntimePropertyBackup {
	readonly property: string;
	readonly target: DisplayObject;
	readonly value: unknown;
}

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
			restoreProperties(backups);
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
					backups = applyStateOverrides(
						previousDefinition.overrides,
						scope,
						`${contractPath}.states.${previousState}`,
						context,
					);
					currentState = previousState;
				}
				throw error;
			}
		},
		clearState(): void {
			if (currentState === undefined) return;
			restoreProperties(backups);
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
	const backups = new Map<string, RuntimePropertyBackup>();
	try {
		for (let index = 0; index < overrides.length; index++) {
			const override = overrides[index];
			const identity = qualifyNodeId(scope, override.targetId);
			const target = context.instances.get(identity);
			const type = context.types.get(identity);
			if (!target || !type) continue;
			const key = `${identity}\u0000${override.property}`;
			if (!backups.has(key)) {
				backups.set(key, {
					property: override.property,
					target,
					value: Reflect.get(target, override.property),
				});
			}
			applyRuntimeProperty(
				target,
				type,
				override.property,
				override.value,
				`${path}.overrides[${index}].value`,
				context,
			);
		}
	} catch (error) {
		restoreProperties([...backups.values()]);
		throw error;
	}
	return [...backups.values()];
}

function restoreProperties(backups: readonly RuntimePropertyBackup[]): void {
	for (let index = backups.length - 1; index >= 0; index--) {
		const backup = backups[index];
		if (!backup) continue;
		Reflect.set(backup.target, backup.property, backup.value);
	}
}
