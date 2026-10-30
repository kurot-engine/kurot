import valueParser from 'postcss-value-parser';

export type ResourceUrlVersioner = (source: string, baseFile: string) => string;

/**
 * Version CSS url() and string @import references, preserving comments and
 * ordinary strings. CSS escaping is decoded for lookup and retained on output.
 */
export function versionCssResources(css: string, file: string, versionUrl: ResourceUrlVersioner): string {
	const parsed = valueParser(css);
	parsed.walk((node, index, nodes) => {
		if (node.type === 'function' && node.value.toLowerCase() === 'url') {
			const value = node.nodes.find(child => child.type !== 'space' && child.type !== 'comment');
			if (value?.type === 'string' || value?.type === 'word') {
				update(value);
			}
			return false;
		}
		if (node.type === 'word' && node.value.toLowerCase() === '@import') {
			const next = nodes.slice(index + 1).find(child => child.type !== 'space' && child.type !== 'comment');
			if (next?.type === 'string') {
				update(next);
			}
		}
	});
	return parsed.toString();

	function update(node: valueParser.StringNode | valueParser.WordNode): void {
		const decoded = node.value.replace(/\\(?:([a-f0-9]{1,6})\s?|([\s\S]))/gi, (_match: string, hex: string | undefined, character: string | undefined) => {
			if (hex) {
				const point = Number.parseInt(hex, 16);
				return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '\uFFFD';
			}
			return character && !/[\r\n\f]/.test(character) ? character : '';
		});
		const next = versionUrl(decoded, file);
		if (next === decoded) {
			return;
		}
		node.value = node.type === 'word'
			? next.replace(/[\\\s"'()]/g, character => '\\' + character)
			: next.replace(/\\/g, '\\\\').split(node.quote).join('\\' + node.quote);
	}
}
