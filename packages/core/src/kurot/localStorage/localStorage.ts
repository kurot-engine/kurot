export function getItem(key: string): string | undefined {
	return window.localStorage.getItem(key) ?? undefined;
}

export function setItem(key: string, value: string): boolean {
	try {
		window.localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

export function removeItem(key: string): void {
	window.localStorage.removeItem(key);
}

export function clear(): void {
	window.localStorage.clear();
}
