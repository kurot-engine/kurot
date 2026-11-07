import { DisplayObject, RenderObjectType } from '../display/DisplayObject.js';
import type { BackdropBlur } from '../display/BackdropBlur.js';
import type { Matrix } from '../geom/Matrix.js';

/**
 * Caches cannot retain backdrop pixels independently of the surrounding scene.
 */
export function containsBackdrop(node: DisplayObject): boolean {
	if (node.$renderObjectType === RenderObjectType.BACKDROP_BLUR) {
		return true;
	}
	return node.$children?.some(containsBackdrop) ?? false;
}

export function assertBackdropCache(node: DisplayObject): void {
	if (containsBackdrop(node)) {
		throw new Error('BackdropBlur cannot be used inside cacheAsTexture/cacheAsBitmap.');
	}
}

export function validateBackdrop(node: BackdropBlur): void {
	if (node.$filters.length || node.$blendMode !== 0) {
		throw new Error('BackdropBlur requires normal blendMode and no filters of its own. Filter its parent instead.');
	}
}

/**
 * Physical bounds enclosing all four transformed corners, including sample padding.
 */
export function backdropBounds(
	m: Pick<Matrix, 'a' | 'b' | 'c' | 'd' | 'tx' | 'ty'>,
	width: number,
	height: number,
	padX: number,
	padY: number,
): { left: number; top: number; right: number; bottom: number } {
	const xs: number[] = [];
	const ys: number[] = [];
	for (const x of [-padX, width + padX]) {
		for (const y of [-padY, height + padY]) {
			xs.push(m.a * x + m.c * y + m.tx);
			ys.push(m.b * x + m.d * y + m.ty);
		}
	}
	return {
		left: Math.floor(Math.min(...xs)), top: Math.floor(Math.min(...ys)),
		right: Math.ceil(Math.max(...xs)), bottom: Math.ceil(Math.max(...ys)),
	};
}
