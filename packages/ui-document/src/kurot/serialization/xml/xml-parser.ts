export interface XMLElement {
	readonly name: string;
	readonly attributes: Readonly<Record<string, string>>;
	readonly children: readonly XMLElement[];
}

const NAME = '[A-Za-z_][\\w:.-]*';
const OPEN_PATTERN = new RegExp(`^<(${NAME})`);
const CLOSE_PATTERN = new RegExp(`^<\\/(${NAME})\\s*>`);
const ATTRIBUTE_PATTERN = new RegExp(`^(${NAME})\\s*=\\s*(?:"([^"]*)"|'([^']*)')`);

/**
 * Parses the XML subset used by canonical KUI documents.
 */
export function parseXML(source: string): XMLElement {
	const parser = new XMLParser(source);
	return parser.parse();
}

class XMLParser {
	private _position = 0;

	public constructor(private readonly _source: string) {}

	public parse(): XMLElement {
		this._skipMiscellaneous();
		const root = this._parseElement();
		this._skipMiscellaneous();
		if (this._position !== this._source.length) {
			throw this._error('Unexpected content after the root element.');
		}
		return root;
	}

	private _parseElement(): XMLElement {
		const opening = this._source.slice(this._position).match(OPEN_PATTERN);
		if (!opening || opening[1] === undefined) {
			throw this._error('Expected an XML element.');
		}

		const name = opening[1];
		this._position += opening[0].length;
		const attributes: Record<string, string> = {};

		for (;;) {
			this._skipWhitespace();
			if (this._source.startsWith('/>', this._position)) {
				this._position += 2;
				return { name, attributes, children: [] };
			}
			if (this._source[this._position] === '>') {
				this._position++;
				break;
			}

			const attribute = this._source.slice(this._position).match(ATTRIBUTE_PATTERN);
			if (!attribute || attribute[1] === undefined) {
				throw this._error(`Invalid attribute in <${name}>.`);
			}
			if (Object.hasOwn(attributes, attribute[1])) {
				throw this._error(`Duplicate attribute "${attribute[1]}" in <${name}>.`);
			}
			attributes[attribute[1]] = decodeXML(attribute[2] ?? attribute[3] ?? '');
			this._position += attribute[0].length;
		}

		const children: XMLElement[] = [];
		for (;;) {
			this._skipMiscellaneous();
			const closing = this._source.slice(this._position).match(CLOSE_PATTERN);
			if (closing) {
				if (closing[1] !== name) {
					throw this._error(`Expected </${name}>, received </${String(closing[1])}>.`);
				}
				this._position += closing[0].length;
				return { name, attributes, children };
			}
			if (this._position >= this._source.length) {
				throw this._error(`Missing closing tag </${name}>.`);
			}
			if (this._source[this._position] !== '<') {
				const text = this._readText();
				if (text.trim().length > 0) {
					throw this._error(`Text content is not allowed inside <${name}>.`);
				}
				continue;
			}
			children.push(this._parseElement());
		}
	}

	private _readText(): string {
		const start = this._position;
		while (this._position < this._source.length && this._source[this._position] !== '<') {
			this._position++;
		}
		return decodeXML(this._source.slice(start, this._position));
	}

	private _skipMiscellaneous(): void {
		for (;;) {
			this._skipWhitespace();
			if (this._source.startsWith('<!--', this._position)) {
				this._skipThrough('-->', 'Unterminated XML comment.');
				continue;
			}
			if (this._source.startsWith('<?', this._position)) {
				this._skipThrough('?>', 'Unterminated processing instruction.');
				continue;
			}
			return;
		}
	}

	private _skipThrough(terminator: string, message: string): void {
		const end = this._source.indexOf(terminator, this._position + 2);
		if (end === -1) {
			throw this._error(message);
		}
		this._position = end + terminator.length;
	}

	private _skipWhitespace(): void {
		while (/\s/.test(this._source[this._position] ?? '')) {
			this._position++;
		}
	}

	private _error(message: string): Error {
		return new Error(`${message} (offset ${this._position})`);
	}
}

function decodeXML(value: string): string {
	const named: Readonly<Record<string, string>> = {
		amp: '&',
		apos: "'",
		gt: '>',
		lt: '<',
		quot: '"',
	};
	return value.replace(/&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (match, entity: string) => {
		if (entity.startsWith('#x')) {
			return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
		}
		if (entity.startsWith('#')) {
			return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
		}
		return named[entity] ?? match;
	});
}
