/** Cache for font file ArrayBuffers, keyed by URL. */
const fontResourceCache: Record<string, ArrayBuffer> = {};

/**
 * Stores a font file buffer for later use by registerFontMapping.
 * Call this after loading a font file via HttpRequest.
 */
export function cacheFontResource(url: string, buffer: ArrayBuffer): void {
	fontResourceCache[url] = buffer;
}

/**
 * Registers a font family name mapped to a font file path.
 * Uses FontFace API if available, otherwise falls back to a @font-face style element.
 */
export function registerFontMapping(name: string, path: string): void {
	if ('FontFace' in window) {
		_loadByFontFace(name, path);
	} else {
		_loadByStyleElement(name, path);
	}
}

function _loadByFontFace(name: string, path: string): void {
	const cached = fontResourceCache[path];
	if (!cached) {
		console.warn(`registerFontMapping: font file not cached for path "${path}". Load it first.`);
		return;
	}
	const fontFace = new FontFace(name, cached);
	document.fonts.add(fontFace);
	fontFace.load().catch(err => {
		console.error('registerFontMapping load error:', err);
	});
}

function _loadByStyleElement(name: string, path: string): void {
	const style = document.createElement('style');
	style.textContent = `@font-face { font-family: "${name}"; src: url("${path}"); }`;
	document.head.appendChild(style);
}
