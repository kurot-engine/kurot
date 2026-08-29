/**
 * Lightweight XML parser for the subset used by EXML skins.
 *
 * Supports prefixed elements, quoted attributes, text, CDATA, comments,
 * processing instructions, and self-closing elements. DTD and entity
 * declarations are outside the supported input contract.
 */

/**
 * Half-open UTF-16 offsets covering parsed source syntax.
 */
export interface SourceRange {
	readonly start: number;
	readonly end: number;
}

/**
 * Base node in the parsed XML tree.
 */
export interface XNode {
	readonly type: 'element' | 'text';
	/**
	 * Range containing the complete node syntax.
	 */
	readonly range: SourceRange;
}

/**
 * Text node whose content has XML entities decoded.
 */
export interface XText extends XNode {
	readonly type: 'text';
	/**
	 * Text content, including insignificant whitespace.
	 */
	readonly text: string;
}

/**
 * Parsed XML attribute.
 */
export interface XAttribute {
	/**
	 * Complete attribute name, including any namespace prefix.
	 */
	readonly name: string;
	/**
	 * Decoded attribute value.
	 */
	readonly value: string;
	/**
	 * Range containing the complete attribute assignment.
	 */
	readonly range: SourceRange;
}

/**
 * Element node in the parsed XML tree.
 */
export interface XElement extends XNode {
	readonly type: 'element';
	/**
	 * Complete tag name, including any namespace prefix.
	 */
	readonly name: string;
	/**
	 * Attributes in source order.
	 */
	readonly attributes: XAttribute[];
	/**
	 * Element and text children in source order.
	 */
	readonly children: XNode[];
}

const RX_OPEN = /^<([a-zA-Z_][\w:.-]*)/;
const RX_CLOSE = /^<\/([a-zA-Z_][\w:.-]*)\s*>/;
const RX_ATTR = /^([a-zA-Z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/;
const CDATA_OPEN_LENGTH = '<![CDATA['.length;

/**
 * Returns the element children from a mixed XML child list.
 */
export function filterElements(children: readonly XNode[]): XElement[] {
	return children.filter((node): node is XElement => node.type === 'element');
}

/**
 * Concatenates the text children from a mixed XML child list.
 */
export function getTextContent(children: readonly XNode[]): string {
	return children
		.filter(isText)
		.map(node => node.text)
		.join('');
}

/**
 * Parses EXML source and returns its first root element.
 *
 * Leading text, comments, and processing instructions are ignored.
 *
 * @throws {Error} If no root element exists or element closing tags are invalid.
 */
export function parseXML(source: string): XElement {
	const parser = new XmlParser(source);
	for (const node of parser.parse()) {
		if (isElement(node)) return node;
	}
	throw new Error('EXML: no root element found');
}

class XmlParser {
	// ── Instance fields ───────────────────────────────────────────────

	private readonly _source: string;
	private _position = 0;

	// ── Constructor ───────────────────────────────────────────────────

	public constructor(source: string) {
		this._source = source;
	}

	// ── Public methods ────────────────────────────────────────────────

	public parse(): XNode[] {
		this._skipWhitespace();
		return this._parseNodes();
	}

	// ── Private methods ───────────────────────────────────────────────

	private _parseNodes(): XNode[] {
		const nodes: XNode[] = [];
		while (this._position < this._source.length) {
			if (this._source[this._position] === '<') {
				if (this._source.slice(this._position).match(RX_CLOSE)) {
					break;
				}
				if (this._source.startsWith('<!--', this._position)) {
					this._skipComment();
					continue;
				}
				if (this._source.startsWith('<![CDATA[', this._position)) {
					nodes.push(this._readCDATA());
					continue;
				}
				if (this._source.startsWith('<?', this._position)) {
					this._skipProcessingInstruction();
					continue;
				}
				const element = this._parseElement();
				if (element) {
					nodes.push(element);
				}
				continue;
			}
			nodes.push(this._readText());
		}
		return nodes;
	}

	private _parseElement(): XElement | undefined {
		const start = this._position;
		if (this._source[this._position] !== '<') return undefined;

		const tagMatch = this._source.slice(this._position).match(RX_OPEN);
		if (!tagMatch) {
			this._position++;
			return undefined;
		}

		const tagName = tagMatch[1];
		this._position += tagMatch[0].length;
		const attributes: XAttribute[] = [];
		for (;;) {
			this._skipWhitespace();
			if (this._position >= this._source.length) {
				break;
			}
			if (this._source.startsWith('/>', this._position)) {
				this._position += 2;
				return {
					type: 'element',
					name: tagName,
					attributes,
					children: [],
					range: { start, end: this._position },
				};
			}
			if (this._source[this._position] === '>') {
				this._position++;
				break;
			}

			const attributeMatch = this._source.slice(this._position).match(RX_ATTR);
			if (!attributeMatch) {
				this._position++;
				continue;
			}
			const attributeStart = this._position;
			this._position += attributeMatch[0].length;
			attributes.push({
				name: attributeMatch[1],
				value: attributeMatch[2] ?? attributeMatch[3],
				range: { start: attributeStart, end: this._position },
			});
		}

		const children = this._parseNodes();
		const closeMatch = this._source.slice(this._position).match(RX_CLOSE);
		if (!closeMatch) {
			throw new Error(`EXML: missing closing tag </${tagName}>`);
		}
		if (closeMatch[1] !== tagName) {
			throw new Error(`EXML: expected closing tag </${tagName}>, got </${closeMatch[1]}>`);
		}
		this._position += closeMatch[0].length;
		return {
			type: 'element',
			name: tagName,
			attributes,
			children,
			range: { start, end: this._position },
		};
	}

	private _readText(): XText {
		const start = this._position;
		let text = '';
		while (this._position < this._source.length && this._source[this._position] !== '<') {
			text += this._source[this._position++];
		}
		return { type: 'text', text: unescapeXML(text), range: { start, end: this._position } };
	}

	private _readCDATA(): XText {
		const start = this._position;
		this._position += CDATA_OPEN_LENGTH;
		const end = this._source.indexOf(']]>', this._position);
		if (end === -1) {
			this._position = this._source.length;
			return { type: 'text', text: this._source.slice(start), range: { start, end: this._position } };
		}
		const text = this._source.slice(this._position, end);
		this._position = end + 3;
		return { type: 'text', text, range: { start, end: this._position } };
	}

	private _skipComment(): void {
		const end = this._source.indexOf('-->', this._position + 4);
		this._position = end === -1 ? this._source.length : end + 3;
	}

	private _skipProcessingInstruction(): void {
		const end = this._source.indexOf('?>', this._position + 2);
		this._position = end === -1 ? this._source.length : end + 2;
	}

	private _skipWhitespace(): void {
		while (this._position < this._source.length && /\s/.test(this._source[this._position])) {
			this._position++;
		}
	}
}

function isText(node: XNode): node is XText {
	return node.type === 'text';
}

function isElement(node: XNode): node is XElement {
	return node.type === 'element';
}

function unescapeXML(value: string): string {
	const entities: Record<string, string> = {
		amp: '\x26',
		lt: '\x3C',
		gt: '\x3E',
		quot: '\x22',
		apos: '\x27',
	};
	return value.replace(/&(amp|lt|gt|quot|apos);/g, (match, name: string) => entities[name] ?? match);
}
