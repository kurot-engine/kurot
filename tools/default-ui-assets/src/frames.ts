export interface UIFrame {
	readonly name: string;
	readonly width: number;
	readonly height: number;
	readonly body: string;
	readonly grid?: string;
}

export const palette = {
	brand: '#1487E8', 'brand-pressed': '#0874CF', 'on-brand': '#071D30',
	canvas: '#EDF3FC', surface: '#FFFFFF', soft: '#F1F5FC', edge: '#DBE5F2',
	text: '#18273E', 'muted-text': '#64748B', 'disabled-text': '#7C8799',
	disabled: '#EEF1F6', selected: '#E4F2FF',
} as const;

function rect(x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string): string {
	return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ''}/>`;
}

function surface(name: string, fill: string, border: string, pressed = false, raised = false): UIFrame {
	const base = raised ? rect(.5, 3.5, 47, 44, 14, border) : '';
	return {
		name, width: 48, height: 48, grid: '16,16,16,16',
		body: base + rect(.5, pressed ? 2.5 : .5, 47, raised ? 44 : 47, 14, fill, border),
	};
}

function choice(name: string, round: boolean, fill: string, border: string, mark?: string): UIFrame {
	const shape = round
		? `<circle cx="14" cy="14" r="12.5" fill="${fill}" stroke="${border}" stroke-width="2"/>`
		: `<rect x="1.5" y="1.5" width="25" height="25" rx="8" fill="${fill}" stroke="${border}" stroke-width="2"/>`;
	const selected = mark ? (round
		? `<circle cx="14" cy="14" r="5" fill="${mark}"/>`
		: `<path d="M8 14l4 4 8-8" fill="none" stroke="${mark}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`) : '';
	return { name, width: 28, height: 28, body: shape + selected };
}

export function createFrames(): readonly UIFrame[] {
	const p = palette;
	const frames: UIFrame[] = [
		surface('button_up', p.brand, '#096FC4', false, true),
		surface('button_down', p['brand-pressed'], '#096FC4', true, true),
		surface('button_disabled', p.disabled, p.edge),
		surface('surface_up', p.soft, p.edge),
		surface('surface_down', '#E4EBF7', '#B9CCE5'),
		surface('surface_selected', p.selected, p.brand),
		surface('surface_selected_down', '#D3E9FE', p['brand-pressed']),
		surface('surface_disabled_selected', '#E4EBF3', '#B9C7D8'),
		{ name: 'panel', width: 64, height: 64, grid: '24,24,16,16', body: rect(.5, .5, 63, 63, 22, p.surface, p.edge) },
		{ name: 'track', width: 8, height: 8, grid: '3,3,2,2', body: rect(0, 0, 8, 8, 4, '#E2EAF6') },
		{ name: 'progress_track', width: 12, height: 12, grid: '5,5,2,2', body: rect(0, 0, 12, 12, 6, '#E2EAF6') },
		{ name: 'progress', width: 12, height: 12, grid: '5,5,2,2', body: rect(0, 0, 12, 12, 6, p.brand) },
		{ name: 'scroll_thumb', width: 8, height: 8, grid: '3,3,2,2', body: rect(0, 0, 8, 8, 4, '#AABBD2') },
	];
	for (const round of [false, true]) {
		const prefix = round ? 'radio' : 'checkbox';
		frames.push(
			choice(`${prefix}_up`, round, p.soft, p.edge),
			choice(`${prefix}_down`, round, '#E4EBF7', '#B9CCE5'),
			choice(`${prefix}_disabled`, round, p.disabled, p.edge),
			choice(`${prefix}_selected`, round, p.brand, p.brand, p['on-brand']),
			choice(`${prefix}_selected_down`, round, p['brand-pressed'], p['brand-pressed'], p['on-brand']),
			choice(`${prefix}_selected_disabled`, round, '#DCE4EE', '#B9C7D8', p['disabled-text']),
		);
	}
	for (const [name, border] of [['slider_thumb', p.brand], ['slider_thumb_disabled', '#B9C7D8']]) {
		frames.push({ name, width: 28, height: 28, body: `<circle cx="14" cy="14" r="11" fill="${p.surface}" stroke="${border}" stroke-width="5"/>` });
	}
	for (const [name, fill] of [['switch_off', '#E2EAF6'], ['switch_on', p.brand], ['switch_disabled_off', p.disabled], ['switch_disabled_on', '#B9C7D8']]) {
		frames.push({ name, width: 56, height: 32, body: rect(.5, .5, 55, 31, 15.5, fill, fill) });
	}
	for (const [name, fill] of [['switch_handle', p.surface], ['switch_handle_disabled', p.disabled]]) {
		frames.push({ name, width: 24, height: 24, body: `<circle cx="12" cy="12" r="11.5" fill="${fill}" stroke="${p.edge}"/>` });
	}
	for (const [name, color, open] of [['chevron', p['muted-text'], false], ['chevron_open', p.brand, true], ['chevron_disabled', p['disabled-text'], false]] as const) {
		frames.push({ name, width: 16, height: 16, body: `<path d="${open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` });
	}
	for (const [name, fill, ink] of [['close_up', p.soft, p['muted-text']], ['close_down', p.selected, p.brand], ['close_disabled', p.disabled, p['disabled-text']]]) {
		frames.push({ name, width: 32, height: 32, body: rect(0, 0, 32, 32, 11, fill) + `<path d="M11 11l10 10m0-10L11 21" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>` });
	}
	return frames;
}
