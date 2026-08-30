import type { DisplayObject } from '@kurot/core';
import type { UIPropertyValue } from '@kurot/ui-document';
import { applyBuiltInProperty } from './builtins/applyBuiltInProperties.js';
import { KurotUIRuntimeError } from './KurotUIRuntimeError.js';
import { resolvePropertyValue } from './resolvePropertyValue.js';
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
 * One captured pre-assignment value together with the layer that owns the
 * property: builtin-owned backups restore reflectively; adapter-owned
 * backups restore through their adapter.
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
 * Each target property is captured exactly once through its owning layer —
 * builtin properties are captured reflectively, while properties consumed by
 * the component adapter are captured through `captureProperty` before the
 * adapter is invoked. If any assignment fails, every captured property is
 * restored in reverse order by its owning layer, and the original failure is
 * rethrown with a failed restore chained onto it as `cause`.
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
			const previous = byProperty.get(update.property);
			if (previous !== undefined) {
				// Repeat assignment of an already-captured property: reuse its
				// recorded owning layer instead of capturing again.
				applyThroughOwner(update, previous, context);
				continue;
			}
			captureAndApply(update, byProperty, backups, context);
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
 * Restores captured values in reverse assignment order through each owning
 * layer. Throws the first restore failure after attempting every remaining
 * restore.
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

/**
 * Chains a secondary failure onto an existing error as its `cause` when the
 * error does not already carry one.
 */
export function attachCause(error: unknown, cause: unknown): void {
	if (error instanceof Error && error.cause === undefined) {
		error.cause = cause;
	}
}

/**
 * Captures and applies the first assignment of one property through the
 * builtin-first routing, registering the backup before any assignment runs so
 * that a throwing assignment still rolls back. Unregisters when the adapter
 * does not consume the property and nothing was applied.
 */
function captureAndApply(
	update: RuntimePropertyUpdate,
	byProperty: Map<string, RuntimePropertyBackup>,
	backups: RuntimePropertyBackup[],
	context: KurotUICreationContext,
): void {
	const resolved = resolvePropertyValue(update.value, update.path, context);
	// Builtin properties are reflective: register the capture before assigning
	// so a throwing setter still rolls back, and unregister when the builtin
	// layer does not own the property.
	const reflective: RuntimePropertyBackup = {
		adapter: undefined,
		path: update.path,
		property: update.property,
		target: update.target,
		value: Reflect.get(update.target, update.property),
	};
	byProperty.set(update.property, reflective);
	backups.push(reflective);
	if (applyBuiltInProperty(update.target, update.property, resolved, update.path)) {
		return;
	}
	byProperty.delete(update.property);
	backups.pop();
	const adapter = context.adapters[update.type];
	if (adapter?.applyProperty !== undefined) {
		// Adapter-owned property: capture through the adapter, register before
		// applying, and unregister when the adapter does not consume it.
		const owned: RuntimePropertyBackup = {
			adapter,
			path: update.path,
			property: update.property,
			target: update.target,
			value: adapter.captureProperty !== undefined
				? adapter.captureProperty(update.target, update.property, update.path)
				: Reflect.get(update.target, update.property),
		};
		byProperty.set(update.property, owned);
		backups.push(owned);
		if (adapter.applyProperty(update.target, update.property, resolved, update.path)) {
			return;
		}
		byProperty.delete(update.property);
		backups.pop();
	}
	throw unsupportedProperty(update);
}

/**
 * Re-applies one update through the owning layer recorded on its backup.
 */
function applyThroughOwner(
	update: RuntimePropertyUpdate,
	backup: RuntimePropertyBackup,
	context: KurotUICreationContext,
): void {
	const resolved = resolvePropertyValue(update.value, update.path, context);
	if (backup.adapter?.applyProperty !== undefined) {
		if (!backup.adapter.applyProperty(
			update.target,
			update.property,
			resolved,
			update.path,
		)) {
			throw unsupportedProperty(update);
		}
	} else if (!applyBuiltInProperty(update.target, update.property, resolved, update.path)) {
		throw unsupportedProperty(update);
	}
}

function unsupportedProperty(update: RuntimePropertyUpdate): KurotUIRuntimeError {
	return new KurotUIRuntimeError(
		'invalid-property',
		`Runtime property "${update.property}" is not supported by ${update.type}.`,
		update.path,
	);
}
