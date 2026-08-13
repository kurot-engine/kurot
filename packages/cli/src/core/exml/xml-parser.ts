/**
 * Lightweight XML parser for EXML files.
 *
 * Designed to handle the subset of XML used by EXML skin definitions:
 * - Element nodes with namespace-prefixed tags
 * - Text nodes (including whitespace)
 * - Attribute values (quoted)
 * - Self-closing elements
 * - CDATA sections
 * - XML comments and processing instructions (skipped)
 *
 * Does NOT support:
 * - DTD / ENTITY declarations
 * - Namespaced attribute prefixes (we only care about the local name)
 */

// ── Public types ─────────────────────────────────────────────────────

/**
 * Half-open offsets covering a parsed XML node or attribute.
 */
export interface SourceRange {
	readonly start: number;
	readonly end: number;
}

export interface XNode {
	/**
	 * Node type.
	 */
	readonly type: 'element' | 'text';
	/**
	 * Half-open source range containing the complete node syntax.
	 */
	readonly range: SourceRange;
}

export interface XText extends XNode {
	readonly type: 'text';
	/**
	 * Raw text content (may be whitespace).
	 */
	readonly text: string;
}

export interface XAttribute {
	/**
	 * Full attribute name including prefix (e.g. "eui:label").
	 */
	readonly name: string;
	/**
	 * Attribute value (unescaped).
	 */
	readonly value: string;
	/**
	 * Half-open source range containing the complete attribute assignment.
	 */
	readonly range: SourceRange;
}

export interface XElement extends XNode {
	readonly type: 'element';
	/**
	 * Full tag name including prefix (e.g. "eui:Button").
	 */
	readonly name: string;
	/**
	 * Attributes in order.
	 */
	readonly attributes: XAttribute[];
	/**
	 * Child nodes (elements and text).
	 */
	readonly children: XNode[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function isText(node: XNode): node is XText {
	return node.type === 'text';
}

export function filterElements(children: readonly XNode[]): XElement[] {
	return children.filter((n): n is XElement => n.type === 'element');
}

export function getTextContent(children: readonly XNode[]): string {
	return children
		.filter(isText)
		.map(t => t.text)
		.join('');
}

// ── Parser implementation ────────────────────────────────────────────

/**
 * Parse an EXML string into an XML element tree.
 * Returns the root element (the `<eui:Skin>` or equivalent).
 */
export function parseXML(source: string): XElement {
	const parser = new _Parser(source);
	const nodes = parser.parse();
	// Find the first element node (skip whitespace text, comments, PI)
	for (const n of nodes) {
		if (n.type === 'element') return n as XElement;
	}
	throw new Error('EXML: no root element found');
}

// ── Internal parser ──────────────────────────────────────────────────

const RX_OPEN = /^<([a-zA-Z_][\w:.-]*)/;
const RX_CLOSE = /^<\/([a-zA-Z_][\w:.-]*)\s*>/;
const RX_ATTR = /^([a-zA-Z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/;

class _Parser {
	private src: string;
	private pos = 0;

	constructor(source: string) {
		this.src = source;
	}

	// ── Main entry ────────────────────────────────────────────────────

	parse(): XNode[] {
		this.skipWhitespace();
		return this.parseNodes();
	}

	// ── Node list ─────────────────────────────────────────────────────

	private parseNodes(): XNode[] {
		const nodes: XNode[] = [];
		while (this.pos < this.src.length) {
			// End of parent element?
			if (this.src[this.pos] === '<') {
				// Closing tag?
				const m = this.src.slice(this.pos).match(RX_CLOSE);
				if (m) break; // let parent handle it

				// Comment
				if (this.src.startsWith('<!--', this.pos)) {
					this.skipComment();
					continue;
				}

				// CDATA
				if (this.src.startsWith('<![CDATA[', this.pos)) {
					nodes.push(this.readCDATA());
					continue;
				}

				// Processing instruction <?...?>
				if (this.src.startsWith('<?', this.pos)) {
					this.skipPI();
					continue;
				}

				// Element
				const el = this.parseElement();
				if (el) nodes.push(el);
				continue;
			}

			// Text content
			nodes.push(this.readText());
		}
		return nodes;
	}

	// ── Element ───────────────────────────────────────────────────────

	private parseElement(): XElement | null {
		const start = this.pos;
		if (this.src[this.pos] !== '<') return null;

		const rest = this.src.slice(this.pos);
		const tagMatch = rest.match(RX_OPEN);
		if (!tagMatch) {
			// Malformed — skip the '<' and continue
			this.pos++;
			return null;
		}

		const tagName = tagMatch[1];
		this.pos += tagMatch[0].length;

		// Parse attributes
		const attrs: XAttribute[] = [];
		for (;;) {
			this.skipWS();
			if (this.pos >= this.src.length) break;

			// Self-closing />
			if (this.src.startsWith('/>', this.pos)) {
				this.pos += 2;
				return { type: 'element', name: tagName, attributes: attrs, children: [], range: { start, end: this.pos } };
			}

			// Open tag end >
			if (this.src[this.pos] === '>') {
				this.pos++;
				break;
			}

			// Attribute
			const am = this.src.slice(this.pos).match(RX_ATTR);
			if (am) {
				const attributeStart = this.pos;
				this.pos += am[0].length;
				attrs.push({
					name: am[1],
					value: am[2] ?? am[3],
					range: { start: attributeStart, end: this.pos },
				});
			} else {
				// Unexpected character — skip
				this.pos++;
			}
		}

		// Children
		const children = this.parseNodes();

		// Consume closing tag
		const closeMatch = this.src.slice(this.pos).match(RX_CLOSE);
		if (closeMatch) {
			if (closeMatch[1] !== tagName) {
				throw new Error(`EXML: expected closing tag </${tagName}>, got </${closeMatch[1]}>`);
			}
			this.pos += closeMatch[0].length;
		} else {
			throw new Error(`EXML: missing closing tag </${tagName}>`);
		}

		return { type: 'element', name: tagName, attributes: attrs, children, range: { start, end: this.pos } };
	}

	// ── Text ──────────────────────────────────────────────────────────

	private readText(): XText {
		const start = this.pos;
		let text = '';
		while (this.pos < this.src.length && this.src[this.pos] !== '<') {
			text += this.src[this.pos++];
		}
		return { type: 'text', text: unescapeXML(text), range: { start, end: this.pos } };
	}

	// ── CDATA ─────────────────────────────────────────────────────────

	private readCDATA(): XText {
		const start = this.pos;
		this.pos += 9; // skip '<![CDATA['
		const end = this.src.indexOf(']]>', this.pos);
		if (end === -1) {
			this.pos = this.src.length;
			return { type: 'text', text: this.src.slice(start), range: { start, end: this.pos } };
		}
		const content = this.src.slice(this.pos, end);
		this.pos = end + 3;
		return { type: 'text', text: content, range: { start, end: this.pos } };
	}

	// ── Skip helpers ──────────────────────────────────────────────────

	private skipComment(): void {
		const end = this.src.indexOf('-->', this.pos + 4);
		this.pos = end === -1 ? this.src.length : end + 3;
	}

	private skipPI(): void {
		const end = this.src.indexOf('?>', this.pos + 2);
		this.pos = end === -1 ? this.src.length : end + 2;
	}

	private skipWS(): void {
		while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
	}

	private skipWhitespace(): void {
		this.skipWS();
	}
}

// ── Unescape XML entities ────────────────────────────────────────────

function unescapeXML(s: string): string {
	// Use hex char codes to avoid auto-formatter converting XML entities
	const ENTITIES: Record<string, string> = {
		amp: '\x26',
		lt: '\x3C',
		gt: '\x3E',
		quot: '\x22',
		apos: '\x27',
	};
	return s.replace(/&(amp|lt|gt|quot|apos);/g, (m, name: string) => ENTITIES[name] ?? m);
}
