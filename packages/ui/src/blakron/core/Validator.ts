import { EventDispatcher, DisplayObjectContainer, type DisplayObject } from '@blakron/core';
import type { IUIComponent } from './IUIComponent.js';

type QueueClient = IUIComponent & DisplayObject;
type ValidatorClient = QueueClient;

/**
 * Manages the deferred invalidation/validation cycle for UI components.
 *
 * When a component marks itself as invalid (properties / size / display list),
 * the Validator queues it and processes all queued components on the next
 * ENTER_FRAME tick, in depth order.
 *
 * Processing order:
 *   1. validateProperties  — shallowest first
 *   2. validateSize        — deepest first ($children before parents)
 *   3. validateDisplayList — shallowest first
 */
export class Validator extends EventDispatcher {
	// ── Instance fields ───────────────────────────────────────────────────

	private _targetLevel = Infinity;
	private _propsFlag = false;
	private _clientPropsFlag = false;
	private _propsQueue = new DepthQueue();
	private _sizeFlag = false;
	private _clientSizeFlag = false;
	private _sizeQueue = new DepthQueue();
	private _displayFlag = false;
	private _displayQueue = new DepthQueue();
	private _scheduled = false;

	// ── Public methods ────────────────────────────────────────────────────

	public invalidateProperties(client: ValidatorClient): void {
		if (!this._propsFlag) {
			this._propsFlag = true;
			this._schedule();
		}
		if (this._targetLevel <= client.$nestLevel) this._clientPropsFlag = true;
		this._propsQueue.insert(client);
	}

	public invalidateSize(client: ValidatorClient): void {
		if (!this._sizeFlag) {
			this._sizeFlag = true;
			this._schedule();
		}
		if (this._targetLevel <= client.$nestLevel) this._clientSizeFlag = true;
		this._sizeQueue.insert(client);
	}

	public invalidateDisplayList(client: ValidatorClient): void {
		if (!this._displayFlag) {
			this._displayFlag = true;
			this._schedule();
		}
		this._displayQueue.insert(client);
	}

	/**
	 * Force immediate validation of all components at or below `target`'s depth.
	 */
	public validateClient(target: ValidatorClient): void {
		const oldLevel = this._targetLevel;
		if (this._targetLevel === Infinity) this._targetLevel = target.$nestLevel;

		try {
			let done = false;
			while (!done) {
				done = true;

				// 1. properties — shallowest first
				let obj = this._propsQueue.removeSmallestChild(target);
				while (obj) {
					if (obj.stage) obj.validateProperties();
					obj = this._propsQueue.removeSmallestChild(target);
				}
				if (this._propsQueue.isEmpty()) this._propsFlag = false;
				this._clientPropsFlag = false;

				// 2. size — deepest first
				obj = this._sizeQueue.removeLargestChild(target);
				while (obj) {
					if (obj.stage) obj.validateSize();
					if (this._clientPropsFlag) {
						const p = this._propsQueue.removeSmallestChild(target);
						if (p) {
							this._propsQueue.insert(p);
							done = false;
							break;
						}
					}
					obj = this._sizeQueue.removeLargestChild(target);
				}
				if (this._sizeQueue.isEmpty()) this._sizeFlag = false;
				this._clientPropsFlag = false;
				this._clientSizeFlag = false;

				// 3. display list — shallowest first
				obj = this._displayQueue.removeSmallestChild(target);
				while (obj) {
					if (obj.stage) obj.validateDisplayList();
					if (this._clientPropsFlag) {
						const p = this._propsQueue.removeSmallestChild(target);
						if (p) {
							this._propsQueue.insert(p);
							done = false;
							break;
						}
					}
					if (this._clientSizeFlag) {
						const s = this._sizeQueue.removeLargestChild(target);
						if (s) {
							this._sizeQueue.insert(s);
							done = false;
							break;
						}
					}
					obj = this._displayQueue.removeSmallestChild(target);
				}
				if (this._displayQueue.isEmpty()) this._displayFlag = false;
			}
		} finally {
			this._targetLevel = oldLevel;
			if (this._propsQueue.isEmpty()) this._propsFlag = false;
			if (this._sizeQueue.isEmpty()) this._sizeFlag = false;
			if (this._displayQueue.isEmpty()) this._displayFlag = false;
			this._clientPropsFlag = false;
			this._clientSizeFlag = false;
		}
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _schedule(): void {
		if (this._scheduled) return;
		this._scheduled = true;
		const tick =
			typeof requestAnimationFrame !== 'undefined'
				? (cb: () => void) => requestAnimationFrame(cb)
				: (cb: () => void) => setTimeout(cb, 0);
		tick(() => this._flush());
	}

	private _flush(): void {
		this._scheduled = false;
		if (this._propsFlag) this._validateProperties();
		if (this._sizeFlag) this._validateSize();
		if (this._displayFlag) this._validateDisplayList();

		if (this._propsFlag || this._sizeFlag || this._displayFlag) {
			this._schedule();
		}
	}

	private _validateProperties(): void {
		let client = this._propsQueue.shift();
		while (client) {
			if (client.stage) client.validateProperties();
			client = this._propsQueue.shift();
		}
		if (this._propsQueue.isEmpty()) this._propsFlag = false;
	}

	private _validateSize(): void {
		let client = this._sizeQueue.pop();
		while (client) {
			if (client.stage) client.validateSize();
			client = this._sizeQueue.pop();
		}
		if (this._sizeQueue.isEmpty()) this._sizeFlag = false;
	}

	private _validateDisplayList(): void {
		let client = this._displayQueue.shift();
		while (client) {
			if (client.stage) client.validateDisplayList();
			client = this._displayQueue.shift();
		}
		if (this._displayQueue.isEmpty()) this._displayFlag = false;
	}
}

// ── Internal depth-sorted queue ───────────────────────────────────────────────

class DepthQueue {
	// ── Instance fields ───────────────────────────────────────────────────

	private _bins: Map<number, DepthBin> = new Map();
	private _min = 0;
	private _max = -1;

	// ── Public methods ────────────────────────────────────────────────────

	public insert(client: QueueClient): void {
		const depth = client.$nestLevel;
		if (this._max < this._min) {
			this._min = this._max = depth;
		} else {
			if (depth < this._min) this._min = depth;
			if (depth > this._max) this._max = depth;
		}
		let bin = this._bins.get(depth);
		if (!bin) {
			bin = new DepthBin();
			this._bins.set(depth, bin);
		}
		bin.insert(client);
	}

	/**
	 * Pop deepest (for size validation — $children before parents).
	 */
	public pop(): QueueClient | undefined {
		let max = this._max;
		const min = this._min;
		while (min <= max) {
			const bin = this._bins.get(max);
			if (bin && bin.length > 0) {
				const client = bin.pop()!;
				while (this._bins.get(this._max)?.length === 0) {
					this._max--;
					if (this._max < min) break;
				}
				return client;
			}
			if (max === this._max) this._max--;
			max--;
		}
		return undefined;
	}

	/**
	 * Shift shallowest (for properties / display list — parents before $children).
	 */
	public shift(): QueueClient | undefined {
		let min = this._min;
		const max = this._max;
		while (min <= max) {
			const bin = this._bins.get(min);
			if (bin && bin.length > 0) {
				const client = bin.pop()!;
				while (this._bins.get(this._min)?.length === 0) {
					this._min++;
					if (this._min > max) break;
				}
				return client;
			}
			if (min === this._min) this._min++;
			min++;
		}
		return undefined;
	}

	public removeLargestChild(target: QueueClient): QueueClient | undefined {
		let max = this._max;
		const min = target.$nestLevel;
		while (min <= max) {
			const bin = this._bins.get(max);
			if (bin && bin.length > 0) {
				if (max === target.$nestLevel) {
					if (bin.has(target)) {
						bin.remove(target);
						return target;
					}
				} else {
					const found = bin.findDescendant(target);
					if (found) {
						bin.remove(found);
						return found;
					}
				}
			}
			max--;
		}
		return undefined;
	}

	public removeSmallestChild(target: QueueClient): QueueClient | undefined {
		let min = target.$nestLevel;
		const max = this._max;
		while (min <= max) {
			const bin = this._bins.get(min);
			if (bin && bin.length > 0) {
				if (min === target.$nestLevel) {
					if (bin.has(target)) {
						bin.remove(target);
						return target;
					}
				} else {
					const found = bin.findDescendant(target);
					if (found) {
						bin.remove(found);
						return found;
					}
				}
			}
			min++;
		}
		return undefined;
	}

	public isEmpty(): boolean {
		return this._min > this._max;
	}
}

class DepthBin {
	// ── Instance fields ───────────────────────────────────────────────────

	public items: QueueClient[] = [];
	public length = 0;

	private _map = new Set<QueueClient>();

	// ── Public methods ────────────────────────────────────────────────────

	public insert(client: QueueClient): void {
		if (this._map.has(client)) return;
		this._map.add(client);
		this.items.push(client);
		this.length++;
	}

	public pop(): QueueClient | undefined {
		const client = this.items.pop();
		if (client) {
			this.length--;
			this._map.delete(client);
		}
		return client;
	}

	public has(client: QueueClient): boolean {
		return this._map.has(client);
	}

	public remove(client: QueueClient): void {
		const idx = this.items.indexOf(client);
		if (idx >= 0) {
			this.items.splice(idx, 1);
			this.length--;
			this._map.delete(client);
		}
	}

	/**
	 * Find a direct or indirect child of `ancestor` in this bin.
	 */
	public findDescendant(ancestor: QueueClient): QueueClient | undefined {
		if (!(ancestor instanceof DisplayObjectContainer)) return undefined;
		for (const item of this.items) {
			if (ancestor.contains(item)) return item;
		}
		return undefined;
	}
}

/**
 * Singleton validator instance shared by all UI components.
 */
export const validator: Validator = new Validator();
