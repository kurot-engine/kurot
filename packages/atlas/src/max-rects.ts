export interface PackingRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface PackingItem {
	name: string;
	width: number;
	height: number;
}

export interface Placement extends PackingRect {
	name: string;
}

export type PackingHeuristic = 'short-side' | 'area' | 'long-side';

export function placeRectangles(
	items: readonly PackingItem[], width: number, height: number, heuristic: PackingHeuristic,
): Placement[] | undefined {
	let free: PackingRect[] = [{ x: 0, y: 0, width, height }];
	const placements: Placement[] = [];
	for (const item of items) {
		let best: PackingRect | undefined;
		let bestPrimary = Infinity;
		let bestSecondary = Infinity;
		for (const rect of free) {
			if (item.width > rect.width || item.height > rect.height) continue;
			const short = Math.min(rect.width - item.width, rect.height - item.height);
			const long = Math.max(rect.width - item.width, rect.height - item.height);
			const primary = heuristic === 'area' ? rect.width * rect.height - item.width * item.height
				: heuristic === 'long-side' ? long : short;
			const secondary = heuristic === 'area' ? short : heuristic === 'long-side' ? short : long;
			if (primary < bestPrimary || (primary === bestPrimary && secondary < bestSecondary) ||
				(primary === bestPrimary && secondary === bestSecondary &&
					(!best || rect.y < best.y || (rect.y === best.y && rect.x < best.x)))) {
				best = rect;
				bestPrimary = primary;
				bestSecondary = secondary;
			}
		}
		if (!best) return undefined;
		const placed = { name: item.name, x: best.x, y: best.y, width: item.width, height: item.height };
		placements.push(placed);
		free = pruneRectangles(free.flatMap(rect => splitRect(rect, placed)));
	}
	return placements;
}

function splitRect(free: PackingRect, used: PackingRect): PackingRect[] {
	const right = free.x + free.width;
	const bottom = free.y + free.height;
	const usedRight = used.x + used.width;
	const usedBottom = used.y + used.height;
	if (used.x >= right || usedRight <= free.x || used.y >= bottom || usedBottom <= free.y) {
		return [free];
	}
	const parts: PackingRect[] = [];
	if (used.x > free.x) {
		parts.push({ x: free.x, y: free.y, width: used.x - free.x, height: free.height });
	}
	if (usedRight < right) {
		parts.push({ x: usedRight, y: free.y, width: right - usedRight, height: free.height });
	}
	if (used.y > free.y) {
		parts.push({ x: free.x, y: free.y, width: free.width, height: used.y - free.y });
	}
	if (usedBottom < bottom) {
		parts.push({ x: free.x, y: usedBottom, width: free.width, height: bottom - usedBottom });
	}
	return parts;
}

function pruneRectangles(rects: readonly PackingRect[]): PackingRect[] {
	return rects.filter((rect, index) => !rects.some((other, otherIndex) => {
		if (index === otherIndex) return false;
		const contained = rect.x >= other.x && rect.y >= other.y &&
			rect.x + rect.width <= other.x + other.width && rect.y + rect.height <= other.y + other.height;
		if (!contained) return false;
		const equal = rect.x === other.x && rect.y === other.y && rect.width === other.width && rect.height === other.height;
		return !equal || otherIndex < index;
	}));
}
