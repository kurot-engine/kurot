export interface UIResourceSubkeyConfig {
	readonly scale9grid?: string;
	readonly [key: string]: unknown;
}

export interface UIResourceConfigEntry extends UIResourceSubkeyConfig {
	readonly name: string;
	readonly type: string;
	readonly url: string;
	readonly subkeys?: Readonly<Record<string, UIResourceSubkeyConfig>>;
}

export type UINineSliceGrid = { x: number; y: number; width: number; height: number };

/**
 * Parses a center rectangle in untrimmed image coordinates; dimensions must leave a nonempty stretch region.
 */
export function parseUINineSliceGrid(value: unknown): UINineSliceGrid {
	if (typeof value !== 'string' || value.split(',').some(part => !part.trim())) {
		throw new Error('scale9grid must contain x,y,width,height.');
	}
	const parts = value.split(',').map(Number);
	if (
		parts.length !== 4 ||
		parts.some(part => !Number.isFinite(part) || part < 0) ||
		parts[2]! <= 0 ||
		parts[3]! <= 0
	) {
		throw new Error('scale9grid must contain nonnegative coordinates and positive dimensions.');
	}
	return { x: parts[0]!, y: parts[1]!, width: parts[2]!, height: parts[3]! };
}

/**
 * Reads authored resource entries. Old comma-separated subkeys belong exclusively to an editor conversion input.
 */
export function parseUIResourceConfigEntries(value: unknown): readonly UIResourceConfigEntry[] {
	if (!isRecord(value) || !Array.isArray(value.resources)) {
		throw new Error('Resource manifest must contain a resources array.');
	}
	const names = new Set<string>();
	return value.resources.map((entry: unknown) => {
		if (
			!isRecord(entry) ||
			typeof entry.name !== 'string' ||
			!entry.name.trim() ||
			typeof entry.type !== 'string' ||
			typeof entry.url !== 'string'
		) {
			throw new Error('Resource entries require name, type and url.');
		}
		if (names.has(entry.name)) {
			throw new Error(`Duplicate resource name: ${entry.name}.`);
		}
		names.add(entry.name);
		if (entry.scale9grid !== undefined) {
			if (entry.type !== 'image') {
				throw new Error(`Resource-level scale9grid requires an image: ${entry.name}.`);
			}
			parseUINineSliceGrid(entry.scale9grid);
		}
		if (entry.subkeys !== undefined) {
			if (!isRecord(entry.subkeys)) {
				throw new Error(`subkeys must be an object: ${entry.name}. Refresh this sheet in Kurot Editor.`);
			}
			for (const [key, config] of Object.entries(entry.subkeys)) {
				if (!key || key.trim() !== key || key.includes(',') || !isRecord(config)) {
					throw new Error(`Invalid subkey configuration: ${entry.name}.${key}.`);
				}
				if (config.scale9grid !== undefined) {
					parseUINineSliceGrid(config.scale9grid);
				}
			}
		}
		return entry as unknown as UIResourceConfigEntry;
	});
}

/**
 * Exact resource and bare-frame identities win over qualified aliases, matching manifest lookup order.
 */
export function getUIResourceNineSlice(
	resources: readonly UIResourceConfigEntry[],
	key: string,
): UINineSliceGrid | undefined {
	const direct = resources.find(entry => entry.name === key);
	if (direct) {
		return direct.type === 'image' && direct.scale9grid ? parseUINineSliceGrid(direct.scale9grid) : undefined;
	}
	for (const entry of resources) {
		if (entry.type === 'sheet' && entry.subkeys && Object.hasOwn(entry.subkeys, key)) {
			const grid = entry.subkeys[key]?.scale9grid;
			return grid ? parseUINineSliceGrid(grid) : undefined;
		}
	}
	for (const entry of resources) {
		const prefix = `${entry.name}.`;
		if (
			entry.type === 'sheet' &&
			key.startsWith(prefix) &&
			entry.subkeys &&
			Object.hasOwn(entry.subkeys, key.slice(prefix.length))
		) {
			const grid = entry.subkeys[key.slice(prefix.length)]?.scale9grid;
			return grid ? parseUINineSliceGrid(grid) : undefined;
		}
	}
	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}
