import { BlendMode, ColorMatrixFilter, DisplayObject, DisplayObjectContainer, Matrix, Mesh, Texture } from '@kurot/core';
import { dragonBones } from '../runtime/dragonbones.js';
import { KurotTextureData } from './KurotTextureData.js';
import { KurotTextureAtlasData } from './KurotTextureAtlasData.js';
import { initializeMesh, deformMesh } from './mesh-geometry.js';

/**
 * A native display-tree slot. Images use two mesh triangles, so image and
 * deformable attachments share the same atlas UV and transform convention.
 */
export class KurotSlot extends dragonBones.Slot {
	public static override toString(): string {
		return '[class KurotSlot]';
	}

	private _renderDisplay?: DisplayObject;
	private _colorFilter?: ColorMatrixFilter;
	private readonly _matrix = new Matrix();

	/**
	 * Armature.replacedTexture calls this even when attachment data is unchanged.
	 * Refresh the native texture view on the next slot update.
	 */
	public override invalidUpdate(): void {
		super.invalidUpdate();
		this._textureDirty = true;
	}

	public override _updateVisible(): void {
		const display = this._renderDisplay;
		if (!display) return;
		const hasContent = (display !== this._rawDisplay && display !== this._meshDisplay) || (display instanceof Mesh && !!display.texture);
		display.visible = this._parent.visible && this._visible && !!this._display && hasContent;
	}

	protected override _onClear(): void {
		super._onClear();
		this._renderDisplay = undefined;
		this._colorFilter = undefined;
	}

	protected override _initDisplay(_value: unknown, _isRetain: boolean): void {}

	protected override _disposeDisplay(value: unknown, _isRelease: boolean): void {
		if (value instanceof DisplayObject) {
			value.parent?.removeChild(value);
		}
		if (value instanceof Mesh) {
			value.texture = undefined;
			value.filters = [];
			value.vertices.length = 0;
			value.uvs.length = 0;
			value.indices.length = 0;
			value.updateVertices();
		}
	}

	protected override _onUpdateDisplay(): void {
		const value: unknown = this._display ?? this._rawDisplay;
		if (!(value instanceof DisplayObject)) throw new Error('Slot display must be a Kurot DisplayObject.');
		this._renderDisplay = value;
	}

	protected override _addDisplay(): void {
		if (this._renderDisplay) {
			const parent: unknown = this._armature.display;
			if (!(parent instanceof DisplayObjectContainer)) throw new Error('Armature display must be a Kurot container.');
			parent.addChild(this._renderDisplay);
		}
	}

	protected override _replaceDisplay(value: unknown): void {
		if (!(value instanceof DisplayObject) || !this._renderDisplay) return;
		const parent = value.parent;
		if (!parent) {
			this._addDisplay();
			return;
		}
		const index = parent.getChildIndex(value);
		parent.removeChild(value);
		parent.addChildAt(this._renderDisplay, index);
	}

	protected override _removeDisplay(): void {
		this._renderDisplay?.parent?.removeChild(this._renderDisplay);
	}

	protected override _updateZOrder(): void {
		const display = this._renderDisplay;
		if (display?.parent) {
			display.parent.setChildIndex(display, this._zOrder);
		}
	}

	protected override _updateBlendMode(): void {
		if (!this._renderDisplay) return;
		switch (this._blendMode) {
			case dragonBones.BlendMode.Add:
				this._renderDisplay.blendMode = BlendMode.ADD;
				break;
			case dragonBones.BlendMode.Erase:
				this._renderDisplay.blendMode = BlendMode.ERASE;
				break;
			default:
				this._renderDisplay.blendMode = BlendMode.NORMAL;
				break;
		}
	}

	protected override _updateColor(): void {
		const display = this._renderDisplay;
		if (!display) return;
		const color = this._colorTransform;
		const alpha = color.alphaMultiplier * this._globalAlpha;
		const rgb = [color.redMultiplier, color.greenMultiplier, color.blueMultiplier];
		const needsFilter = color.redOffset !== 0 || color.greenOffset !== 0 || color.blueOffset !== 0 || color.alphaOffset !== 0 || rgb.some(value => value < 0 || value > 1);
		if (needsFilter) {
			this._colorFilter ??= new ColorMatrixFilter();
			this._colorFilter.matrix = [rgb[0], 0, 0, 0, color.redOffset, 0, rgb[1], 0, 0, color.greenOffset, 0, 0, rgb[2], 0, color.blueOffset, 0, 0, 0, alpha, color.alphaOffset];
			if (!display.filters.includes(this._colorFilter)) {
				display.filters = [...display.filters, this._colorFilter];
			}
			display.tint = 0xffffff;
			display.alpha = 1;
		} else {
			if (this._colorFilter) {
				display.filters = display.filters.filter(filter => filter !== this._colorFilter);
			}
			display.tint = (Math.round(rgb[0] * 255) << 16) | (Math.round(rgb[1] * 255) << 8) | Math.round(rgb[2] * 255);
			display.alpha = alpha;
		}
	}

	protected override _updateFrame(): void {
		const display = this._renderDisplay;
		if (!(display instanceof Mesh)) return;
		let data = this._textureData as KurotTextureData | undefined;
		if (data && this._armature.replacedTexture) {
			const replacement: unknown = this._armature.replacedTexture;
			if (!(replacement instanceof Texture)) throw new Error('Replacement atlas must be a Kurot Texture.');
			let atlas = this._armature._replaceTextureAtlasData as KurotTextureAtlasData | undefined;
			if (!atlas) {
				atlas = dragonBones.BaseObject.borrowObject(KurotTextureAtlasData);
				atlas.copyFrom(data.parent);
				atlas.renderTexture = replacement;
				this._armature._replaceTextureAtlasData = atlas;
			}
			data = atlas.getTexture(data.name) as KurotTextureData | undefined;
		}
		const texture = data?.renderTexture;
		if (!texture || !this._displayFrame || !this._display) {
			display.texture = undefined;
			display.visible = false;
			return;
		}
		display.texture = texture;
		display.anchorOffsetX = this._pivotX;
		display.anchorOffsetY = this._pivotY;
		const scale = this._armature.armatureData.scale;
		if (this._geometryData) {
			initializeMesh(display, this._geometryData, scale);
			if (this._geometryData.weight || this._parent instanceof dragonBones.Surface) {
				this._identityTransform();
			}
		} else {
			const atlasScale = data!.parent.scale * scale;
			const width = texture.textureWidth * atlasScale;
			const height = texture.textureHeight * atlasScale;
			display.vertices = [0, 0, width, 0, width, height, 0, height];
			display.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
			display.indices = [0, 1, 2, 0, 2, 3];
			display.updateVertices();
		}
		this._visibleDirty = true;
	}

	protected override _updateMesh(): void {
		if (!(this._renderDisplay instanceof Mesh) || !this._geometryData || !this._displayFrame) return;
		deformMesh(this._renderDisplay, this._geometryData, this._geometryBones, this._parent, this._displayFrame.deformVertices, this._armature.armatureData.scale);
	}

	protected override _updateTransform(): void {
		if (!this._renderDisplay) return;
		const m = this.globalTransformMatrix;
		this._matrix.setTo(m.a, m.b, m.c, m.d, m.tx, m.ty);
		this._renderDisplay.matrix = this._matrix;
	}

	protected override _identityTransform(): void {
		if (this._renderDisplay) {
			this._matrix.identity();
			this._renderDisplay.matrix = this._matrix;
		}
	}
}
