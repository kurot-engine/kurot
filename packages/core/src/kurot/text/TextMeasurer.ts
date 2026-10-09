let sharedCanvas: HTMLCanvasElement | undefined;
let sharedContext: CanvasRenderingContext2D | undefined;

function getContext(): CanvasRenderingContext2D {
	if (!sharedContext) {
		sharedCanvas = document.createElement('canvas');
		sharedCanvas.width = 1;
		sharedCanvas.height = 1;
		sharedContext = sharedCanvas.getContext('2d')!;
	}
	return sharedContext;
}

function buildFontString(fontSize: number, fontFamily: string, bold: boolean, italic: boolean): string {
	let font = '';
	if (italic) font += 'italic ';
	if (bold) font += 'bold ';
	font += fontSize + 'px ';
	font += fontFamily;
	return font;
}

/**
 * Measures the width of a text string using Canvas 2D.
 */
export function measureText(
	text: string,
	fontFamily: string,
	fontSize: number,
	bold: boolean,
	italic: boolean,
): number {
	return measureTextMetrics(text, fontFamily, fontSize, bold, italic).width;
}

/**
 * Measures logical-pixel ink and font bounds relative to the alphabetic baseline.
 * The caller owns caching and invalidation when fonts become ready.
 */
export function measureTextMetrics(
	text: string,
	fontFamily: string,
	fontSize: number,
	bold: boolean,
	italic: boolean,
): TextMetrics {
	const ctx = getContext();
	ctx.font = buildFontString(fontSize, fontFamily, bold, italic);
	ctx.textBaseline = 'alphabetic';
	ctx.textAlign = 'left';
	return ctx.measureText(text);
}

/**
 * Builds a CSS font string from the given parameters.
 */
export function getFontString(fontSize: number, fontFamily: string, bold: boolean, italic: boolean): string {
	return buildFontString(fontSize, fontFamily, bold, italic);
}
