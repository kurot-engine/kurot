/**
 * Resource type constants.
 */
export const ResourceType = {
	Image: 'image',
	Json: 'json',
	Text: 'text',
	Sound: 'sound',
	Sheet: 'sheet',
} as const;

export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

/**
 * Represents a single resource entry.
 */
export class ResourceItem {
	public name: string;
	public url: string;
	public type: string;
	public groupName = '';
	public loaded = false;

	public constructor(name: string, url: string, type: string) {
		this.name = name;
		this.url = url;
		this.type = type;
	}

	public toString(): string {
		return `[ResourceItem name="${this.name}" url="${this.url}" type="${this.type}"]`;
	}
}
