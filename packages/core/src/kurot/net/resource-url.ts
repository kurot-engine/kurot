/**
 * Resolve a local file below the page's resource/ directory using the release
 * build number emitted by the CLI. Available before createPlayer, including
 * project font/style loading. Without build metadata, return the input unchanged.
 *
 * Existing query parameters and fragments are preserved; v is replaced once.
 * External origins, APIs outside resource/, directories, data/blob URLs and
 * JavaScript modules retain their original URLs. Native fetch/FontFace callers
 * can use this function explicitly; Core's resource transports use it directly.
 *
 * Available since Core 2.7.0; resource metadata requires CLI >= 3.8.1 within 3.x.
 */
export function resolveResourceUrl(input: string | URL): string {
	const source = String(input);
	if (!source || source.startsWith('#') || typeof document === 'undefined') {
		return source;
	}
	const version = document.querySelector<HTMLMetaElement>('meta[name="kurot-resource-version"]')?.content.trim();
	if (!version) {
		return source;
	}
	let url: URL;
	let root: URL;
	let page: URL;
	try {
		url = new URL(source, document.baseURI);
		root = new URL('resource/', document.baseURI);
		page = new URL(document.URL);
	} catch {
		return source;
	}
	if (!['http:', 'https:'].includes(url.protocol) || url.origin !== page.origin ||
		url.origin !== root.origin || !url.pathname.startsWith(root.pathname) ||
		url.pathname.endsWith('/') || /\.(?:m?js|cjs)$/i.test(url.pathname)) {
		return source;
	}
	url.searchParams.set('v', version);
	return url.href;
}
