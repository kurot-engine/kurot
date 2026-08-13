import { describe, expect, it } from 'vitest';
import { DiagnosticCollector, DIAGNOSTIC_CODES } from '../src/core/diagnostics/index.js';
import type { Diagnostic } from '../src/core/diagnostics/index.js';

describe('DiagnosticCollector', () => {
	it('collects warnings without changing them in normal mode', () => {
		const collector = new DiagnosticCollector({ strict: false });
		collector.report(makeUnknownTagDiagnostic());

		expect(collector.all()).toEqual([makeUnknownTagDiagnostic()]);
		expect(collector.hasErrors()).toBe(false);
	});

	it('promotes strict warning codes to errors in strict mode', () => {
		const collector = new DiagnosticCollector({ strict: true });
		collector.report(makeUnknownTagDiagnostic());

		expect(collector.all()).toEqual([{ ...makeUnknownTagDiagnostic(), severity: 'error' }]);
		expect(collector.hasErrors()).toBe(true);
	});

	it('does not promote unrelated warnings in strict mode', () => {
		const collector = new DiagnosticCollector({ strict: true });
		collector.report({
			code: 'KUROT_WATCH_RELEASE_IGNORED',
			severity: 'warning',
			message: 'Release mode was ignored.',
		});

		expect(collector.all()[0]?.severity).toBe('warning');
		expect(collector.hasErrors()).toBe(false);
	});

	it('preserves diagnostics that are already errors', () => {
		const collector = new DiagnosticCollector({ strict: false });
		const diagnostic: Diagnostic = {
			code: DIAGNOSTIC_CODES.EXML_COMPILE_FAILED,
			severity: 'error',
			message: 'The skin could not be compiled.',
		};
		collector.report(diagnostic);

		expect(collector.all()).toEqual([diagnostic]);
		expect(collector.hasErrors()).toBe(true);
	});

	it('deduplicates identical diagnostics', () => {
		const collector = new DiagnosticCollector({ strict: false });
		collector.report(makeUnknownTagDiagnostic());
		collector.report(makeUnknownTagDiagnostic());

		expect(collector.all()).toHaveLength(1);
	});

	it('keeps diagnostics with the same code at different locations', () => {
		const collector = new DiagnosticCollector({ strict: false });
		collector.report(makeUnknownTagDiagnostic());
		collector.report({
			...makeUnknownTagDiagnostic(),
			location: { file: 'skins/Main.exml', line: 8, column: 2, offset: 140 },
		});

		expect(collector.all()).toHaveLength(2);
	});

	it('sorts by file, line, column, then code', () => {
		const collector = new DiagnosticCollector({ strict: false });
		collector.report({
			code: DIAGNOSTIC_CODES.THEME_SKIN_NOT_FOUND,
			severity: 'warning',
			message: 'Missing skin.',
			location: { file: 'theme.json', line: 4, column: 8 },
		});
		collector.report({
			code: DIAGNOSTIC_CODES.EXML_DECLARED_FILE_NOT_FOUND,
			severity: 'warning',
			message: 'Missing file.',
			location: { file: 'theme.json', line: 4, column: 2 },
		});
		collector.report(makeUnknownTagDiagnostic());

		expect(collector.all().map(diagnostic => diagnostic.code)).toEqual([
			DIAGNOSTIC_CODES.EXML_UNKNOWN_TAG,
			DIAGNOSTIC_CODES.EXML_DECLARED_FILE_NOT_FOUND,
			DIAGNOSTIC_CODES.THEME_SKIN_NOT_FOUND,
		]);
	});

	it('returns JSON-serializable diagnostics without Error objects', () => {
		const collector = new DiagnosticCollector({ strict: false });
		collector.report(makeUnknownTagDiagnostic());

		expect(JSON.parse(JSON.stringify(collector.all()))).toEqual(collector.all());
	});
});

function makeUnknownTagDiagnostic(): Diagnostic {
	return {
		code: DIAGNOSTIC_CODES.EXML_UNKNOWN_TAG,
		severity: 'warning',
		message: 'Unknown EXML tag: eui:Buton.',
		location: { file: 'skins/ButtonSkin.exml', line: 3, column: 2, offset: 82 },
		suggestions: ['Did you mean eui:Button?'],
	};
}
