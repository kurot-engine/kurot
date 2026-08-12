export function toColorString(value: number): string {
	const clamped = Math.max(0, Math.min(0xffffff, value || 0));
	return '#' + clamped.toString(16).toUpperCase().padStart(6, '0');
}
