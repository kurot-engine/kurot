import { ResourceItem } from './ResourceItem.js';

/**
 * Resource event type constants.
 */
export const ResourceEventType = {
	CONFIG_COMPLETE: 'configComplete',
	CONFIG_LOAD_ERROR: 'configLoadError',
	GROUP_COMPLETE: 'groupComplete',
	GROUP_PROGRESS: 'groupProgress',
	GROUP_LOAD_ERROR: 'groupLoadError',
	ITEM_LOAD_ERROR: 'itemLoadError',
} as const;

export type ResourceEventType = (typeof ResourceEventType)[keyof typeof ResourceEventType];

/**
 * Event data passed to resource event listeners.
 */
export interface ResourceEvent {
	/** Event type */
	type: ResourceEventType;
	/** Group name (for group events) */
	groupName: string;
	/** The resource item involved (may be undefined for group-level events) */
	item?: ResourceItem;
	/** Number of items loaded so far in the group */
	itemsLoaded: number;
	/** Total number of items in the group */
	itemsTotal: number;
}
