import type { DisplayObject } from '../../display/DisplayObject.js';
import type { Rectangle } from '../../geom/Rectangle.js';

/**
 * Render-only bounds include descendant effects without changing layout bounds.
 * The owner's padding is added separately by FilterPipe.
 */
export function getFilterContentBounds(owner: DisplayObject): Rectangle {
	let bounds = owner.$getOriginalBounds().clone();
	for (const child of owner.$children ?? []) {
		if (!child.visible || child.alpha <= 0 || child.$maskedObject) continue;
		const childBounds = getFilterContentBounds(child);
		for (const filter of child.$filters) {
			const padding = filter.getPadding();
			childBounds.x -= padding.left;
			childBounds.y -= padding.top;
			childBounds.width += padding.left + padding.right;
			childBounds.height += padding.top + padding.bottom;
		}
		childBounds.x -= child.$anchorOffsetX + (child.$scrollRect?.x ?? 0);
		childBounds.y -= child.$anchorOffsetY + (child.$scrollRect?.y ?? 0);
		child.$getMatrix().transformBounds(childBounds);
		bounds = bounds.union(childBounds);
	}
	return bounds;
}
