import { ResourceItem } from './ResourceItem.js';

/**
 * Raw resource config file format.
 */
export interface ResourceConfigData {
	resources: ResourceConfigEntry[];
	groups: ResourceGroupEntry[];
}

export interface ResourceConfigEntry {
	name: string;
	type: string;
	url: string;
	subkeys?: string;
	[key: string]: unknown;
}

export interface ResourceGroupEntry {
	name: string;
	keys: string;
}

/**
 * Parses and manages resource configuration data.
 * Maintains key→item mapping and group→item[] mapping.
 */
export class ResourceConfig {
	private keyMap = new Map<string, ResourceConfigEntry>();
	private groupDic = new Map<string, ResourceConfigEntry[]>();

	/**
	 * Parse a config JSON object.
	 * @param data The parsed JSON data from resource.json
	 * @param folder URL prefix for relative paths
	 */
	public parseConfig(data: ResourceConfigData, folder: string): void {
		if (!data) return;

		const resources = data.resources;
		if (resources) {
			for (const item of resources) {
				let url: string = item.url;
				if (url && !url.includes('://')) {
					item.url = folder + url;
				}
				this.addItemToKeyMap(item);
			}
		}

		const groups = data.groups;
		if (groups) {
			for (const group of groups) {
				const list: ResourceConfigEntry[] = [];
				const keys = group.keys.split(',');
				for (const rawKey of keys) {
					const name = rawKey.trim();
					const item = this.keyMap.get(name);
					if (item && !list.includes(item)) {
						list.push(item);
					}
				}
				this.groupDic.set(group.name, list);
			}
		}
	}

	/**
	 * Get a list of ResourceItem objects for a group.
	 */
	public getGroupByName(name: string): ResourceItem[] {
		const list = this.groupDic.get(name);
		if (!list) return [];

		return list.map(entry => this.parseResourceItem(entry));
	}

	/**
	 * Create a custom resource group from a list of keys.
	 * @param name Group name
	 * @param keys Resource keys or existing group names to include
	 * @param override Whether to overwrite an existing group
	 */
	public createGroup(name: string, keys: string[], override = false): boolean {
		if ((!override && this.groupDic.has(name)) || !keys || keys.length === 0) {
			return false;
		}

		const group: ResourceConfigEntry[] = [];

		for (const key of keys) {
			const existingGroup = this.groupDic.get(key);
			if (existingGroup) {
				for (const item of existingGroup) {
					if (!group.includes(item)) {
						group.push(item);
					}
				}
			} else {
				const item = this.keyMap.get(key);
				if (item) {
					if (!group.includes(item)) {
						group.push(item);
					}
				}
			}
		}

		if (group.length === 0) return false;

		this.groupDic.set(name, group);
		return true;
	}

	/**
	 * Add a resource config entry directly.
	 */
	public addItem(item: ResourceConfigEntry): void {
		this.addItemToKeyMap(item);
	}

	/**
	 * Get the type of a resource by key.
	 */
	public getType(key: string): string {
		const data = this.keyMap.get(key);
		return data ? data.type : '';
	}

	/**
	 * Get a ResourceItem by key.
	 */
	public getResourceItem(key: string): ResourceItem | undefined {
		const data = this.keyMap.get(key);
		if (data) return this.parseResourceItem(data);
		return undefined;
	}

	/**
	 * Check if a key exists in the config.
	 */
	public hasKey(key: string): boolean {
		return this.keyMap.has(key);
	}

	/**
	 * Check if a group exists.
	 */
	public hasGroup(name: string): boolean {
		return this.groupDic.has(name);
	}

	/**
	 * Get all group names.
	 */
	public getGroupNames(): string[] {
		return Array.from(this.groupDic.keys());
	}

	// ── Private helpers ──────────────────────────────────────────────────────

	private addItemToKeyMap(item: ResourceConfigEntry): void {
		if (!this.keyMap.has(item.name)) {
			this.keyMap.set(item.name, item);
		}
		if (item.subkeys) {
			for (const rawKey of item.subkeys.split(',')) {
				const key = rawKey.trim();
				if (!key) continue;
				if (!this.keyMap.has(key)) {
					this.keyMap.set(key, item);
				}
			}
		}
	}

	private parseResourceItem(data: ResourceConfigEntry): ResourceItem {
		return new ResourceItem(data.name, data.url, data.type);
	}
}
