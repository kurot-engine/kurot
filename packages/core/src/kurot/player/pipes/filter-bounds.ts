import type { DisplayObject } from '../../display/DisplayObject.js';
import type { Rectangle } from '../../geom/Rectangle.js';
import { getRenderContentBounds } from '../render-bounds.js';

/**
 * Render-only bounds include descendant effects without changing layout bounds.
 * The owner's padding is added separately by FilterPipe.
 */
export function getFilterContentBounds(owner: DisplayObject): Rectangle {
	return getRenderContentBounds(owner, true);
}
