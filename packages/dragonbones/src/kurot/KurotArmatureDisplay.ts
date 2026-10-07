import { Sprite } from '@kurot/core';
import type { Event } from '@kurot/core';
import type { dragonBones } from '../runtime/dragonbones.js';
import { DragonBonesEvent } from './DragonBonesEvent.js';

export type DragonBonesListener = (event: DragonBonesEvent) => void;

interface ListenerBinding {
	type: string;
	listener: DragonBonesListener;
	thisObject?: unknown;
	receive: (event: Event) => void;
}

/**
 * Renderable armature proxy. Removing it from a container does not release it;
 * call dispose() to remove its armature from the factory clock.
 */
export class KurotArmatureDisplay extends Sprite implements dragonBones.IArmatureProxy {
	private _armature?: dragonBones.Armature;
	private _disposed = false;
	private _release?: () => void;
	private readonly _bindings: ListenerBinding[] = [];

	public get armature(): dragonBones.Armature {
		if (!this._armature || this._disposed) throw new Error('Armature display is not available.');
		return this._armature;
	}

	public get animation(): dragonBones.Animation {
		return this.armature.animation;
	}

	public get disposed(): boolean {
		return this._disposed;
	}

	public dbInit(armature: dragonBones.Armature): void {
		this._armature = armature;
		this._disposed = false;
	}

	public dbClear(): void {
		this._armature = undefined;
		this._disposed = true;
		this.parent?.removeChild(this);
		this.removeChildren();
		for (const binding of this._bindings) {
			this.removeEventListener(binding.type, binding.receive);
		}
		this._bindings.length = 0;
		this.releaseOwnership();
	}

	public dbUpdate(): void {}

	public dispose(_disposeProxy = true): void {
		if (this._disposed) return;
		this._disposed = true;
		this.parent?.removeChild(this);
		this._armature?.dispose();
		this.releaseOwnership();
	}

	public hasDBEventListener(type: string): boolean {
		return !this._disposed && this.hasEventListener(type);
	}

	public dispatchDBEvent(type: string, eventObject: dragonBones.EventObject): void {
		if (!this._disposed) {
			this.dispatchEvent(new DragonBonesEvent(type, eventObject));
		}
	}

	public addDBEventListener(type: string, listener: DragonBonesListener, thisObject?: unknown): void {
		if (this._disposed) throw new Error('Cannot subscribe to a disposed armature.');
		if (this._bindings.some(binding => binding.type === type && binding.listener === listener && binding.thisObject === thisObject)) return;
		const receive = (event: Event): void => {
			if (event instanceof DragonBonesEvent) {
				listener.call(thisObject, event);
			}
		};
		this._bindings.push({ type, listener, thisObject, receive });
		this.addEventListener(type, receive);
	}

	public removeDBEventListener(type: string, listener: DragonBonesListener, thisObject?: unknown): void {
		const index = this._bindings.findIndex(binding => binding.type === type && binding.listener === listener && binding.thisObject === thisObject);
		if (index < 0) return;
		this.removeEventListener(type, this._bindings[index].receive);
		this._bindings.splice(index, 1);
	}

	/**
	 * Factory ownership callback; nested armatures remain owned by their parent slot.
	 */
	public setReleaseHandler(release: () => void): void {
		this._release = release;
	}

	private releaseOwnership(): void {
		const release = this._release;
		this._release = undefined;
		release?.();
	}
}
