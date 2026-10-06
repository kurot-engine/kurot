import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleManager } from '../templates/game/src/LocaleManager.js';

const config = {
	locale: [
		{ code: 'en_US', name: 'English' },
		{ code: 'fr_FR', name: 'Français' },
	],
	defaultLocale: 'en_US',
};
const resources: Record<string, string> = {
	lang_en_US_properties: 'title=Hello\nbutton=Click Me\namount=Bet {0}',
	lang_fr_FR_properties: 'title=Bonjour',
};

beforeEach(() => {
	LocaleManager.init(undefined, () => undefined);
});

describe('game template project languages', () => {
	it('uses project defaults, full URL codes and short language codes, with English/key fallback', () => {
		LocaleManager.init(config, name => resources[name]);
		expect(LocaleManager.currentLocale).toBe('en_US');
		expect(LocaleManager.getString('title')).toBe('Hello');
		for (const requested of ['fr-FR', 'FR_fr', 'fr']) {
			LocaleManager.init(config, name => resources[name], requested);
			expect(LocaleManager.currentLocale).toBe('fr_FR');
			expect(LocaleManager.getString('title')).toBe('Bonjour');
			expect(LocaleManager.getString('button')).toBe('Click Me');
			expect(LocaleManager.getString('missing')).toBe('missing');
		}
		LocaleManager.init(config, name => resources[name], 'de');
		expect(LocaleManager.currentLocale).toBe('en_US');
	});

	it('accepts no languages or an empty default without inventing registrations', () => {
		LocaleManager.init({ locale: [], defaultLocale: '' }, () => undefined, 'en');
		expect(LocaleManager.currentLocale).toBe('');
		expect(LocaleManager.getString('title')).toBe('title');
		LocaleManager.init({ ...config, defaultLocale: '' }, name => resources[name]);
		expect(LocaleManager.currentLocale).toBe('');
		expect(LocaleManager.getString('title')).toBe('Hello');
		LocaleManager.init({ locale: config.locale }, name => resources[name]);
		expect(LocaleManager.currentLocale).toBe('en_US');
	});

	it('preserves the last registered language set after missing resources or invalid configuration', () => {
		LocaleManager.init(config, name => resources[name], 'fr');
		const invalid = [
			{ locale: config.locale, defaultLocale: 'de_DE' },
			{ locale: [config.locale[0], config.locale[0]], defaultLocale: 'en_US' },
			{ locale: [{ code: 'en-US', name: 'English' }], defaultLocale: '' },
			{ locale: config.locale, defaultLocale: 1 },
			{ locale: '' },
		];
		for (const value of invalid) {
			expect(() => LocaleManager.init(value, name => resources[name])).toThrow();
			expect(LocaleManager.currentLocale).toBe('fr_FR');
			expect(LocaleManager.getString('title')).toBe('Bonjour');
		}
		expect(() => LocaleManager.init(config, () => undefined)).toThrow('Language resource is unavailable');
		expect(LocaleManager.getString('title')).toBe('Bonjour');
	});

	it('decodes properties escapes, skips comments and interpolates supplied arguments only', () => {
		const source = String.raw`# Comment
! Comment
message=Line one\nLine two\t\u00e9
amount=Bet {0} {1}
path=C:\\fonts
literal=\100.80
empty=
not a property`;
		LocaleManager.init({ locale: [config.locale[0]], defaultLocale: 'en_US' }, () => source);
		expect(LocaleManager.getString('message')).toBe('Line one\nLine two\té');
		expect(LocaleManager.getString('amount', 12)).toBe('Bet 12 {1}');
		expect(LocaleManager.getString('path')).toBe('C:\\fonts');
		expect(LocaleManager.getString('literal')).toBe('\\100.80');
		expect(LocaleManager.getString('empty')).toBe('');
	});
});
