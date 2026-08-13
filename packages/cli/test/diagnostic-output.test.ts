import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	parseBuildDiagnosticsFormat,
	parseDevDiagnosticsFormat,
	writeMachineOutput,
} from '../src/core/diagnostics/index.js';
import { ConfigError } from '../src/core/errors.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('diagnostic output formats', () => {
	it('accepts supported build and dev formats', () => {
		expect(parseBuildDiagnosticsFormat('human')).toBe('human');
		expect(parseBuildDiagnosticsFormat('json')).toBe('json');
		expect(parseDevDiagnosticsFormat('human')).toBe('human');
		expect(parseDevDiagnosticsFormat('jsonl')).toBe('jsonl');
	});

	it('rejects unsupported formats with a ConfigError', () => {
		expect(() => parseBuildDiagnosticsFormat('jsonl')).toThrow(ConfigError);
		expect(() => parseBuildDiagnosticsFormat('jsonl')).toThrow('Expected human or json.');
		expect(() => parseDevDiagnosticsFormat('json')).toThrow(ConfigError);
		expect(() => parseDevDiagnosticsFormat('json')).toThrow('Expected human or jsonl.');
	});

	it('writes one ANSI-free JSON value per line', () => {
		const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

		writeMachineOutput({
			type: 'diagnostic',
			diagnostic: {
				code: 'KUROT_EXML_UNKNOWN_TAG',
				severity: 'warning',
				message: 'Unknown tag.',
			},
		});

		const output = String(write.mock.calls[0]?.[0]);
		expect(output.endsWith('\n')).toBe(true);
		expect(output).not.toContain('\u001b');
		expect(JSON.parse(output)).toEqual({
			type: 'diagnostic',
			diagnostic: {
				code: 'KUROT_EXML_UNKNOWN_TAG',
				severity: 'warning',
				message: 'Unknown tag.',
			},
		});
	});
});
