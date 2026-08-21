export const BENCHMARK_PROTOCOL_VERSION = 1;
export const DEFAULT_BENCHMARK_SEED = 0x4b55524f;

/**
 * Creates a deterministic random-number source for reproducible workloads.
 */
export function createSeededRandom(seed: number = DEFAULT_BENCHMARK_SEED): () => number {
	let state = seed >>> 0;
	return (): number => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
	};
}
