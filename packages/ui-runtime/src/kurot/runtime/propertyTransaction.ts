import type { DisplayObject } from '@kurot/core';
import type { UIPropertyValue } from '@kurot/ui-document';
import { applyRuntimeProperty } from './applyRuntimeProperty.js';
import type {
	KurotUIComponentAdapter,
	KurotUICreationContext,
} from './types.js';

/**
 * One property assignment to apply transactionally.
 */
export interface RuntimePropertyUpdate {
	/**
	 * Semantic document path used in failure diagnostics.
	 */
	readonly path: string;

	/**
	 * Runtime property name to assign.
	 */
	readonly property: string;

	/**
	 * Materialized object receiving the assignment.
	 */
	readonly target: DisplayObject;

	/**
	 * Canonical component type of the target, used for adapter lookup.
	 */
	readonly type: string;

	/**
	 * Authored value to assign.
	 */
	readonly value: UIPropertyValue;
}

/**
 * One captured pre-assignment value, restorable through its adapter when one
 * owns the property.
 */
export interface RuntimePropertyBackup {
	readonly adapter: KurotUIComponentAdapter | undefined;
	readonly path: string;
	readonly property: string;
	readonly target: DisplayObject;
	readonly value: unknown;
}

/**
 * Applies updates in order and returns the captured pre-assignment backups.
 * Each target property is captured exactly once (through the target's adapter
 * when it owns the property) before its first assignment; if any assignment
 * fails, every captured property is restored in reverse order and the original
 * failure is rethrown, with a failed restore chained onto it as `cause`.
 */
export function applyPropertyUpdates(
	updates: readonly RuntimePropertyUpdate[],
	context: KurotUICreationContext,
): RuntimePropertyBackup[] {
	const backups: RuntimePropertyBackup[] = [];
	const captured = new Map<DisplayObject, Map<string, RuntimePropertyBackup>>();
	try {
		for (const update of updates) {
			let byProperty = captured.get(update.target);
			if (byProperty === undefined) {
				byProperty = new Map();
				captured.set(update.target, byProperty);
			}
			let backup = byProperty.get(update.property);
			if (backup === undefined) {
				backup = captureBackup(update, context);
				byProperty.set(update.property, backup);
				backups.push(backup);
			}
			applyRuntimeProperty(
				update.target,
				update.type,
				update.property,
				update.value,
				update.path,
				context,
			);
		}
	} catch (error) {
		let restoreError: unknown;
		try {
			restorePropertyBackups(backups);
		} catch (secondary) {
			restoreError = secondary;
		}
		if (restoreError !== undefined) {
			attachCause(error, restoreError);
		}
		throw error;
	}
	return backups;
}

/**
 * Restores captured values in reverse assignment order. Throws the first
 * restore failure after attempting every remaining restore.
 */
export function restorePropertyBackups(
	backups: readonly RuntimePropertyBackup[],
): void {
	let failure: unknown;
	for (let index = backups.length - 1; index >= 0; index--) {
		const backup = backups[index];
		if (backup === undefined) {
			continue;
		}
		try {
			if (backup.adapter?.restoreProperty !== undefined) {
				backup.adapter.restoreProperty(
					backup.target,
					backup.property,
					backup.value,
					backup.path,
				);
			} else {
				Reflect.set(backup.target, backup.property, backup.value);
			}
		} catch (error) {
			failure ??= error;
		}
	}
	if (failure !== undefined) {
		throw failure;
	}
}

function captureBackup(
	update: RuntimePropertyUpdate,
	context: KurotUICreationContext,
): RuntimePropertyBackup {
	const adapter = context.adapters[update.type];
	if (adapter?.captureProperty !== undefined) {
		return {
			adapter,
			path: update.path,
			property: update.property,
			target: update.target,
			value: adapter.captureProperty(update.target, update.property, update.path),
		};
	}
	return {
		adapter,
		path: update.path,
		property: update.property,
		target: update.target,
		value: Reflect.get(update.target, update.property),
	};
}

/**
 * Chains a secondary failure onto an existing error as its `cause` when the
 * error does not already carry one.
 */
export function attachCause(error: unknown, cause: unknown): void {
	if (error instanceof Error && error.cause === undefined) {
		error.cause = cause;
	}
}
