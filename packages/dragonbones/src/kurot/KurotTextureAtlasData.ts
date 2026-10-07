import { SpriteSheet } from '@kurot/core';
import type { Texture } from '@kurot/core';
import { dragonBones } from '../runtime/dragonbones.js';
import { KurotTextureData } from './KurotTextureData.js';

/**
 * Atlas regions borrow the supplied page texture. Clearing the atlas disposes
 * its region views, never the caller-owned page or its BitmapData.
 */
export class KurotTextureAtlasData extends dragonBones.TextureAtlasData {
	public static override toString(): string {
		return '[class KurotTextureAtlasData]';
	}

	private _renderTexture?: Texture;

	public get renderTexture(): Texture | undefined {
		return this._renderTexture;
	}
	public set renderTexture(value: Texture | undefined) {
		if (value === this._renderTexture) return;
		this._renderTexture = value;
		const sheet = value ? new SpriteSheet(value) : undefined;
		for (const entry of Object.values(this.textures)) {
			const data = entry as KurotTextureData;
			data.renderTexture?.dispose();
			data.renderTexture = undefined;
			if (!sheet) continue;
			const { x, y, width, height } = data.region;
			const texture = sheet.createTexture(data.name, x, y, data.rotated ? height : width, data.rotated ? width : height);
			texture.rotated = data.rotated;
			data.renderTexture = texture;
		}
	}

	public override createTexture(): KurotTextureData {
		return dragonBones.BaseObject.borrowObject(KurotTextureData);
	}

	protected override _onClear(): void {
		super._onClear();
		this._renderTexture = undefined;
	}
}
