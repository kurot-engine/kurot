import { describe, it, expect } from 'vitest';
import * as ui from '../src/index.js';

describe('ui package sanity', () => {
	it('exports the public API symbols', () => {
		// Spot-check a representative symbol from each major module.
		// If index.ts barrel exports break, or a module fails to load under
		// the current @blakron/core peer, this test catches it.
		expect(typeof ui.Validator).toBe('function');
		expect(typeof ui.BasicLayout).toBe('function');
		expect(typeof ui.Button).toBe('function');
		expect(typeof ui.ArrayCollection).toBe('function');
		expect(typeof ui.Watcher).toBe('function');
	});

	it('exports the shared validator singleton', () => {
		// Regression guard for the core 1.0 adaptation: HashObject/.hashCode
		// was removed in core 1.0. Validator's DepthBin previously keyed its
		// dedup Set on client.hashCode; it now keys on the object reference
		// itself (Set<QueueClient>). The dedup-by-identity behaviour is
		// enforced by the type system and manual demo verification; here we
		// only assert the singleton loads and is an instance of Validator.
		expect(ui.validator).toBeInstanceOf(ui.Validator);
	});
});
