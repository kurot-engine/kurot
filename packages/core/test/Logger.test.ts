import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LogLevel } from '../src/blakron/utils/Logger.js';

describe('Logger', () => {
	beforeEach(() => {
		vi.spyOn(console, 'debug').mockImplementation(() => {});
		vi.spyOn(console, 'info').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Logger.logLevel = LogLevel.ALL;
	});

	it('default logLevel is ALL', () => {
		expect(Logger.logLevel).toBe(LogLevel.ALL);
	});

	it('set logLevel controls output', () => {
		Logger.logLevel = LogLevel.ERROR;
		expect(Logger.logLevel).toBe(LogLevel.ERROR);
	});

	it('debug logs when level <= DEBUG', () => {
		Logger.logLevel = LogLevel.DEBUG;
		Logger.debug('test');
		expect(console.debug).toHaveBeenCalled();
	});

	it('debug does not log when level > DEBUG', () => {
		Logger.logLevel = LogLevel.INFO;
		Logger.debug('test');
		expect(console.debug).not.toHaveBeenCalled();
	});

	it('info logs when level <= INFO', () => {
		Logger.logLevel = LogLevel.INFO;
		Logger.info('test');
		expect(console.info).toHaveBeenCalled();
	});

	it('info does not log when level > INFO', () => {
		Logger.logLevel = LogLevel.WARN;
		Logger.info('test');
		expect(console.info).not.toHaveBeenCalled();
	});

	it('warn logs when level <= WARN', () => {
		Logger.logLevel = LogLevel.WARN;
		Logger.warn('test');
		expect(console.warn).toHaveBeenCalled();
	});

	it('warn does not log when level > WARN', () => {
		Logger.logLevel = LogLevel.ERROR;
		Logger.warn('test');
		expect(console.warn).not.toHaveBeenCalled();
	});

	it('error logs when level <= ERROR', () => {
		Logger.logLevel = LogLevel.ERROR;
		Logger.error('test');
		expect(console.error).toHaveBeenCalled();
	});

	it('error does not log when level > ERROR (OFF)', () => {
		Logger.logLevel = LogLevel.OFF;
		Logger.error('test');
		expect(console.error).not.toHaveBeenCalled();
	});

	it('ALL logs everything', () => {
		Logger.logLevel = LogLevel.ALL;
		Logger.debug('a');
		Logger.info('b');
		Logger.warn('c');
		Logger.error('d');
		expect(console.debug).toHaveBeenCalled();
		expect(console.info).toHaveBeenCalled();
		expect(console.warn).toHaveBeenCalled();
		expect(console.error).toHaveBeenCalled();
	});

	it('OFF logs nothing', () => {
		Logger.logLevel = LogLevel.OFF;
		Logger.debug('a');
		Logger.info('b');
		Logger.warn('c');
		Logger.error('d');
		expect(console.debug).not.toHaveBeenCalled();
		expect(console.info).not.toHaveBeenCalled();
		expect(console.warn).not.toHaveBeenCalled();
		expect(console.error).not.toHaveBeenCalled();
	});
});
