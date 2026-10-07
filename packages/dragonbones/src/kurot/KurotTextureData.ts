import type { Texture } from '@kurot/core';
import { dragonBones } from '../runtime/dragonbones.js';

export class KurotTextureData extends dragonBones.TextureData {
	public static override toString(): string {
		return '[class KurotTextureData]';
	}

	public renderTexture?: Texture;

	protected override _onClear(): void {
		this.renderTexture?.dispose();
		this.renderTexture = undefined;
		super._onClear();
	}
}
