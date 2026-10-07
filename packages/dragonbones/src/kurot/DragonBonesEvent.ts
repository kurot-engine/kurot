import { Event } from '@kurot/core';
import type { dragonBones } from '../runtime/dragonbones.js';

/**
 * Animation event with stable scalar values. eventObject is pooled upstream
 * and must only be inspected synchronously inside the listener.
 */
export class DragonBonesEvent extends Event {
	public readonly name: string;
	public readonly time: number;
	public readonly animationName: string;

	public constructor(
		type: string,
		public readonly eventObject: dragonBones.EventObject,
	) {
		super(type, false, false, eventObject);
		this.name = eventObject.name;
		this.time = eventObject.time;
		this.animationName = eventObject.animationState?.name ?? '';
	}
}
