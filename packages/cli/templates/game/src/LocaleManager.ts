/**
 * preload 完成后注册项目翻译。URL 的 lang 优先，缺失翻译回退英语，再回退键名。
 * 不监听 UI、不自动重写文本；界面创建时主动调用 getString。
 */
export class LocaleManager {
	private static _locales = new Map<string, ReadonlyMap<string, string>>();
	private static _currentLocale = '';

	public static get currentLocale(): string {
		return this._currentLocale;
	}

	/**
	 * 先验证整份配置及语言资源，成功后一起替换，避免加载失败留下半套翻译。
	 */
	public static init(config: unknown, readResource: (name: string) => unknown, requestedLocale = ''): void {
		const locales = new Map<string, ReadonlyMap<string, string>>();
		let defaultLocale = '';
		if (config !== undefined) {
			if (!isRecord(config) || !Array.isArray(config.locale)) {
				throw new Error('locale.json must contain a locale array.');
			}
			for (const entry of config.locale as unknown[]) {
				if (
					!isRecord(entry) ||
					typeof entry.code !== 'string' ||
					!/^[a-z]{2}_[A-Z]{2}$/.test(entry.code) ||
					typeof entry.name !== 'string' ||
					entry.name.trim() === ''
				) {
					throw new Error('Each project language must have a language code and name.');
				}
				if (locales.has(entry.code)) {
					throw new Error(`Duplicate project language: ${entry.code}.`);
				}
				const source = readResource(`lang_${entry.code}_properties`);
				if (typeof source !== 'string') {
					throw new Error(`Language resource is unavailable: ${entry.code}.`);
				}
				locales.set(entry.code, this._parse(source));
			}
			const configuredDefault =
				config.defaultLocale === undefined ? (locales.has('en_US') ? 'en_US' : '') : config.defaultLocale;
			if (
				typeof configuredDefault !== 'string' ||
				(configuredDefault !== '' && !locales.has(configuredDefault))
			) {
				throw new Error('defaultLocale must name an enabled language or be empty.');
			}
			defaultLocale = configuredDefault;
		}

		const normalized = requestedLocale.trim().replace(/-/g, '_').toLowerCase();
		const codes = [...locales.keys()];
		const exact = codes.find(code => code.toLowerCase() === normalized);
		const base = normalized.split('_')[0];
		this._currentLocale = exact ?? codes.find(code => code.toLowerCase().split('_')[0] === base) ?? defaultLocale;
		this._locales = locales;
	}

	public static getString(key: string, ...args: Array<string | number>): string {
		const text = this._locales.get(this._currentLocale)?.get(key) ?? this._locales.get('en_US')?.get(key) ?? key;
		return text.replace(/\{(\d+)\}/g, (placeholder: string, index: string) => {
			const argument = args[Number(index)];
			return argument === undefined ? placeholder : String(argument);
		});
	}

	private static _parse(source: string): ReadonlyMap<string, string> {
		const values = new Map<string, string>();
		for (const line of source.split(/\r?\n/)) {
			const content = line.trim();
			if (!content || content.startsWith('#') || content.startsWith('!')) {
				continue;
			}
			const split = line.indexOf('=');
			if (split < 0) {
				continue;
			}
			const key = line.slice(0, split).trim();
			if (key) {
				values.set(key, this._decodeValue(line.slice(split + 1).trim()));
			}
		}
		return values;
	}

	private static _decodeValue(value: string): string {
		return value.replace(/\\(u[0-9a-fA-F]{4}|[nrt\\=: ])/g, (_match: string, escape: string) => {
			if (escape.startsWith('u')) {
				return String.fromCharCode(Number.parseInt(escape.slice(1), 16));
			}
			switch (escape) {
				case 'n':
					return '\n';
				case 'r':
					return '\r';
				case 't':
					return '\t';
				default:
					return escape;
			}
		});
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
