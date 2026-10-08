import type { DisplayObject } from '../display/DisplayObject.js';
import { RenderObjectType } from '../display/DisplayObject.js';
import type { Rectangle } from '../geom/Rectangle.js';
import type { TextField } from '../text/TextField.js';
import { getTextRenderPadding } from '../text/TextRenderBounds.js';

/**
 * Includes descendant text ink without changing layout or hit-test bounds.
 * With filters enabled, includes descendant effects but not the owner's filters.
 */
export function getRenderContentBounds(owner: DisplayObject, includeFilters = false): Rectangle {
	let bounds = owner.$getOriginalBounds().clone();
	if (owner.$renderObjectType === RenderObjectType.TEXT && bounds.width > 0 && bounds.height > 0) {
		const padding = getTextRenderPadding(owner as TextField);
		bounds.x -= padding;
		bounds.y -= padding;
		bounds.width += padding * 2;
		bounds.height += padding * 2;
	}
	for (const child of owner.$children ?? []) {
		if (!child.visible || child.alpha <= 0 || child.$maskedObject) continue;
		const childBounds = getRenderContentBounds(child, includeFilters);
		if (includeFilters) {
			for (const filter of child.$filters) {
				const padding = filter.getPadding();
				childBounds.x -= padding.left;
				childBounds.y -= padding.top;
				childBounds.width += padding.left + padding.right;
				childBounds.height += padding.top + padding.bottom;
			}
		}
		childBounds.x -= child.$anchorOffsetX + (child.$scrollRect?.x ?? 0);
		childBounds.y -= child.$anchorOffsetY + (child.$scrollRect?.y ?? 0);
		child.$getMatrix().transformBounds(childBounds);
		bounds = bounds.union(childBounds);
	}
	return bounds;
}
