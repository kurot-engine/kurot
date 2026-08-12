/**
 * TabBar regression tests.
 *
 * Verifies that TabBar defaults to requireSelection=true (egret parity),
 * so a tab is always selected once data is available.
 */
import { describe, it, expect } from 'vitest';
import { TabBar } from '../src/index.js';
import { ArrayCollection } from '../src/index.js';

function makeTabBar(items: unknown[]): TabBar {
	const tb = new TabBar();
	tb.dataProvider = new ArrayCollection(items);
	tb.validateProperties();
	return tb;
}

describe('TabBar', () => {
	it('defaults to requireSelection=true', () => {
		const tb = new TabBar();
		expect(tb.requireSelection).toBe(true);
	});

	it('auto-selects index 0 when data is set', () => {
		const tb = makeTabBar(['tab1', 'tab2', 'tab3']);
		expect(tb.selectedIndex).toBe(0);
	});

	it('prevents deselecting to -1', () => {
		const tb = makeTabBar(['tab1', 'tab2']);
		expect(tb.selectedIndex).toBe(0);

		tb.selectedIndex = -1;
		tb.validateProperties();
		expect(tb.selectedIndex).toBe(0); // stayed at 0
	});

	it('allows switching to another tab', () => {
		const tb = makeTabBar(['tab1', 'tab2', 'tab3']);
		tb.selectedIndex = 2;
		tb.validateProperties();
		expect(tb.selectedIndex).toBe(2);
	});
});
