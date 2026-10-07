import { Mesh, Texture, ticker } from '@kurot/core';
import { dragonBones } from '../runtime/dragonbones.js';
import { KurotArmatureDisplay } from './KurotArmatureDisplay.js';
import { KurotTextureAtlasData } from './KurotTextureAtlasData.js';
import { KurotSlot } from './KurotSlot.js';

export interface KurotFactoryOptions {
	/**
	 * Defaults to true. Disable to drive advanceTime(seconds) from your own loop.
	 */
	autoUpdate?: boolean;
}

/**
 * Owns parsed data, armature displays and one optional Kurot ticker callback.
 * Atlas page textures remain owned by the caller.
 */
export class KurotFactory extends dragonBones.BaseFactory {
	private readonly _displays = new Set<KurotArmatureDisplay>();
	private readonly _soundEvents = new KurotArmatureDisplay();
	private _autoUpdate: boolean;
	private _ticking = false;
	private _disposed = false;
	private _lastTime?: number;
	private _advancing = false;
	private _needsFlush = false;
	private _disposeRequested = false;

	public constructor(options: KurotFactoryOptions = {}) {
		super();
		this._autoUpdate = options.autoUpdate ?? true;
		this._dragonBones = new dragonBones.DragonBones(this._soundEvents);
	}

	public get autoUpdate(): boolean {
		return this._autoUpdate;
	}
	public set autoUpdate(value: boolean) {
		this.assertAlive();
		if (value === this._autoUpdate) return;
		this._autoUpdate = value;
		this.updateTicker();
	}

	public get displayCount(): number {
		return this._displays.size;
	}

	public get soundEventManager(): KurotArmatureDisplay {
		return this._soundEvents;
	}

	public get disposed(): boolean {
		return this._disposed;
	}

	public parseSkeleton(data: unknown, name?: string, scale = 1): dragonBones.DragonBonesData {
		this.assertAlive();
		const result = this.parseDragonBonesData(data, name, scale);
		if (!result) throw new Error('Unable to parse DragonBones skeleton.');
		return result;
	}

	/**
	 * The supplied texture must represent the complete atlas page, not a cropped frame.
	 */
	public parseAtlas(data: unknown, texture: Texture, name?: string, scale = 1): KurotTextureAtlasData {
		this.assertAlive();
		if (
			!texture.bitmapData ||
			texture.bitmapX !== 0 ||
			texture.bitmapY !== 0 ||
			texture.rotated ||
			texture.bitmapWidth !== texture.bitmapData.width ||
			texture.bitmapHeight !== texture.bitmapData.height ||
			texture.offsetX !== 0 ||
			texture.offsetY !== 0
		) {
			throw new Error('Atlas page must be a complete, unrotated Kurot Texture.');
		}
		return this.parseTextureAtlasData(data, texture, name, scale) as KurotTextureAtlasData;
	}

	public buildArmatureDisplay(armatureName: string, dragonBonesName = '', skinName = '', textureAtlasName = ''): KurotArmatureDisplay | undefined {
		this.assertAlive();
		const armature = this.buildArmature(armatureName, dragonBonesName, skinName, textureAtlasName);
		if (!armature) return undefined;
		const display = armature.display as KurotArmatureDisplay;
		this._displays.add(display);
		this.clock.add(armature);
		display.setReleaseHandler(() => {
			this.clock.remove(armature);
			this._displays.delete(display);
			this.updateTicker();
			if (this._advancing) {
				this._needsFlush = true;
			} else {
				this.advanceTime(0);
			}
		});
		this.updateTicker();
		return display;
	}

	/**
	 * Elapsed time in seconds. Use either automatic updating or one external driver.
	 */
	public advanceTime(seconds: number): void {
		if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Elapsed seconds must be finite and non-negative.');
		if (this._disposed) return;
		if (this._advancing) throw new Error('DragonBones clock cannot be advanced recursively.');
		this._advancing = true;
		try {
			this._dragonBones.advanceTime(seconds);
		} finally {
			this._advancing = false;
		}
		if (this._disposeRequested) {
			this._disposeRequested = false;
			this.dispose();
		} else if (this._needsFlush) {
			this._needsFlush = false;
			this.advanceTime(0);
		}
	}

	public dispose(): void {
		if (this._disposed) return;
		if (this._advancing) {
			this._disposeRequested = true;
			return;
		}
		this._autoUpdate = false;
		this.updateTicker();
		for (const display of [...this._displays]) {
			display.dispose();
		}
		this.advanceTime(0);
		this.clear(true);
		this.advanceTime(0);
		this._soundEvents.dbClear();
		this._disposed = true;
	}

	public override clear(disposeData = true): void {
		if (disposeData && this._displays.size > 0) {
			throw new Error('Dispose armature displays before clearing their data.');
		}
		super.clear(disposeData);
	}

	protected override _isSupportMesh(): boolean {
		return true;
	}

	protected override _buildTextureAtlasData(data: unknown, texture: unknown): KurotTextureAtlasData {
		const atlas = data instanceof KurotTextureAtlasData ? data : dragonBones.BaseObject.borrowObject(KurotTextureAtlasData);
		if (texture instanceof Texture) {
			atlas.renderTexture = texture;
		}
		return atlas;
	}

	protected override _buildArmature(data: dragonBones.BuildArmaturePackage): dragonBones.Armature {
		this.assertAlive();
		const armature = dragonBones.BaseObject.borrowObject(dragonBones.Armature);
		const display = new KurotArmatureDisplay();
		armature.init(data.armature, display, display, this._dragonBones);
		return armature;
	}

	protected override _buildSlot(_data: dragonBones.BuildArmaturePackage, slotData: dragonBones.SlotData, armature: dragonBones.Armature): KurotSlot {
		const slot = dragonBones.BaseObject.borrowObject(KurotSlot);
		slot.init(slotData, armature, new Mesh(), new Mesh());
		return slot;
	}

	private updateTicker(): void {
		const ticking = !this._disposed && this._autoUpdate && this._displays.size > 0;
		if (ticking === this._ticking) return;
		this._ticking = ticking;
		this._lastTime = undefined;
		if (ticking) {
			ticker.startTick(this.handleTick, this);
		} else {
			ticker.stopTick(this.handleTick, this);
		}
	}

	private handleTick(time: number): boolean {
		const elapsed = this._lastTime === undefined ? 0 : Math.max(0, time - this._lastTime) / 1000;
		this._lastTime = time;
		this.advanceTime(elapsed);
		return true;
	}

	private assertAlive(): void {
		if (this._disposed) throw new Error('DragonBones factory has been disposed.');
	}
}
