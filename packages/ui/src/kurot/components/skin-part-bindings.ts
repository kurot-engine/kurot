type PartValidator = (value: unknown) => boolean;

interface PartBinding {
	readonly name: string;
	readonly value: unknown;
	readonly native: boolean;
	readonly previous?: PropertyDescriptor;
}

/**
 * Owns only the field references installed for one host's current skin.
 * Native slots retain their setters; ordinary parts use data properties.
 */
export class SkinPartBindings {
	private _bindings: readonly PartBinding[] = [];

	public constructor(
		private readonly _host: object,
		private readonly _validator: (name: string) => PartValidator | undefined,
	) {}

	/**
	 * Validates the complete candidate before the current skin is detached.
	 */
	public prepare(parts: Readonly<Record<string, unknown>>): readonly PartBinding[] {
		const result: PartBinding[] = [];
		for (const [name, value] of Object.entries(parts)) {
			if (name.startsWith('_') || name.startsWith('$') || name === 'constructor' || name === 'prototype') {
				this._fail(name, 'reserved member name');
			}
			const validator = this._validator(name);
			if (validator) {
				if (!validator(value)) {
					this._fail(name, 'invalid native part type');
				}
				if (!this._nativeWritable(name)) {
					this._fail(name, 'native slot is not writable');
				}
				result.push({ name, value, native: true });
				continue;
			}
			const current = Object.getOwnPropertyDescriptor(this._host, name);
			const owned = this._bindings.find(binding => binding.name === name && !binding.native);
			if (owned && current && 'value' in current && current.value === owned.value) {
				if ((!owned.previous && !current.configurable) || (!current.configurable && !current.writable)) {
					this._fail(name, 'field is no longer writable');
				}
				result.push({ name, value, native: false, previous: owned.previous });
				continue;
			}
			if (current) {
				if (!('value' in current) || current.value !== undefined || !current.writable) {
					this._fail(name, 'conflicts with an existing host field');
				}
			} else if (name in this._host || !Object.isExtensible(this._host)) {
				this._fail(name, 'conflicts with a host member or a non-extensible host');
			}
			result.push({ name, value, native: false, previous: current });
		}
		return result;
	}

	/**
	 * Installs a validated complete part set without invoking application setters.
	 */
	public bind(bindings: readonly PartBinding[]): void {
		this._bindings = bindings;
		for (const binding of bindings) {
			if (binding.native) {
				if (!Reflect.set(this._host, binding.name, binding.value)) {
					this._fail(binding.name, 'native slot is not writable');
				}
			} else {
				Object.defineProperty(this._host, binding.name, {
					...(binding.previous ?? { configurable: true, enumerable: true, writable: true }),
					value: binding.value,
				});
			}
		}
	}

	/**
	 * Releases owned references while preserving fields reassigned by the caller.
	 */
	public clear(): void {
		for (const binding of this._bindings) {
			if (binding.native) {
				if (Reflect.get(this._host, binding.name) === binding.value) {
					Reflect.set(this._host, binding.name, undefined);
				}
				continue;
			}
			const current = Object.getOwnPropertyDescriptor(this._host, binding.name);
			if (!current || !('value' in current) || current.value !== binding.value) {
				continue;
			}
			if (binding.previous) {
				Object.defineProperty(this._host, binding.name, binding.previous);
			} else if (!Reflect.deleteProperty(this._host, binding.name)) {
				this._fail(binding.name, 'installed field is no longer configurable');
			}
		}
		this._bindings = [];
	}

	private _fail(name: string, reason: string): never {
		throw new Error(`Skin part "${name}" ${reason}.`);
	}

	private _nativeWritable(name: string): boolean {
		let target: object | undefined = this._host;
		while (target) {
			const descriptor = Object.getOwnPropertyDescriptor(target, name);
			if (descriptor) {
				return 'value' in descriptor
					? !!descriptor.writable && (target === this._host || Object.isExtensible(this._host))
					: typeof descriptor.set === 'function';
			}
			target = Object.getPrototypeOf(target) ?? undefined;
		}
		return Object.isExtensible(this._host);
	}
}
