interface WebGLDiagnostics {
	supported: boolean;
	version?: string;
	vendor?: string;
	renderer?: string;
	maxTextureSize?: number;
	maxTextureUnits?: number;
	maxRenderbufferSize?: number;
}

interface DeviceMatrixRecord {
	schemaVersion: 1;
	timestamp: string;
	release: string;
	device: string;
	gpuClass: string;
	browser: {
		userAgent: string;
		language: string;
		platform: string;
		hardwareConcurrency: number;
		deviceMemoryGiB?: number;
		viewport: string;
		screen: string;
		devicePixelRatio: number;
		maxTouchPoints: number;
	};
	webgl1: WebGLDiagnostics;
	webgl2: WebGLDiagnostics;
	checks: { visual: boolean; interaction: boolean; contextRestore: boolean; soak: boolean };
	knownExceptions: string;
}

const webgl2 = inspectWebGL('webgl2');
const webgl1 = inspectWebGL('webgl');
renderBrowser();
renderDiagnostics('webgl2', webgl2);
renderDiagnostics('webgl1', webgl1);
getElement<HTMLButtonElement>('copy').addEventListener('click', async () => {
	await navigator.clipboard.writeText(JSON.stringify(buildRecord(), null, 2));
	setStatus('Copied');
});
getElement<HTMLButtonElement>('download').addEventListener('click', () => download(buildRecord()));

function buildRecord(): DeviceMatrixRecord {
	const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
	return {
		schemaVersion: 1,
		timestamp: new Date().toISOString(),
		release: getElement<HTMLInputElement>('release').value.trim(),
		device: getElement<HTMLInputElement>('device').value.trim(),
		gpuClass: getElement<HTMLSelectElement>('class').value,
		browser: {
			userAgent: navigator.userAgent,
			language: navigator.language,
			platform: navigator.platform,
			hardwareConcurrency: navigator.hardwareConcurrency,
			deviceMemoryGiB: navigatorWithMemory.deviceMemory,
			viewport: `${innerWidth}x${innerHeight}`,
			screen: `${screen.width}x${screen.height}`,
			devicePixelRatio,
			maxTouchPoints: navigator.maxTouchPoints,
		},
		webgl1,
		webgl2,
		checks: {
			visual: getElement<HTMLInputElement>('visual').checked,
			interaction: getElement<HTMLInputElement>('interaction').checked,
			contextRestore: getElement<HTMLInputElement>('context').checked,
			soak: getElement<HTMLInputElement>('soak').checked,
		},
		knownExceptions: getElement<HTMLTextAreaElement>('notes').value.trim(),
	};
}

function inspectWebGL(kind: 'webgl' | 'webgl2'): WebGLDiagnostics {
	const canvas = document.createElement('canvas');
	const gl: WebGLRenderingContext | WebGL2RenderingContext | null =
		kind === 'webgl2' ? canvas.getContext('webgl2') : canvas.getContext('webgl');
	if (!gl) return { supported: false };
	const debug = gl.getExtension('WEBGL_debug_renderer_info');
	return {
		supported: true,
		version: String(gl.getParameter(gl.VERSION)),
		vendor: debug ? String(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)) : String(gl.getParameter(gl.VENDOR)),
		renderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER)),
		maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
		maxTextureUnits: Number(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)),
		maxRenderbufferSize: Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)),
	};
}

function renderBrowser(): void {
	const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
	renderRows('browser', [
		['User agent', navigator.userAgent],
		['Platform', navigator.platform],
		['Language', navigator.language],
		['Viewport', `${innerWidth} × ${innerHeight}`],
		['Screen', `${screen.width} × ${screen.height} @ ${devicePixelRatio}x`],
		['CPU threads', String(navigator.hardwareConcurrency)],
		['Device memory', memory === undefined ? 'Unavailable' : `${memory} GiB`],
		['Touch points', String(navigator.maxTouchPoints)],
	]);
}

function renderDiagnostics(id: string, value: WebGLDiagnostics): void {
	renderRows(id, value.supported ? [
		['Supported', 'Yes'], ['Version', value.version ?? 'Unknown'], ['Vendor', value.vendor ?? 'Unknown'],
		['Renderer', value.renderer ?? 'Unknown'], ['Max texture', String(value.maxTextureSize)],
		['Texture units', String(value.maxTextureUnits)], ['Max renderbuffer', String(value.maxRenderbufferSize)],
	] : [['Supported', 'No']]);
}

function renderRows(id: string, rows: string[][]): void {
	const target = getElement(id);
	for (const [label, value] of rows) {
		const row = document.createElement('div');
		row.className = 'metric-row';
		const key = document.createElement('span');
		key.className = 'label';
		key.textContent = label;
		const content = document.createElement('span');
		content.className = 'value';
		content.textContent = value;
		row.append(key, content);
		target.append(row);
	}
}

function download(record: DeviceMatrixRecord): void {
	const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
	const anchor = document.createElement('a');
	anchor.href = URL.createObjectURL(blob);
	anchor.download = `device-${slug(record.device || 'unnamed')}-${slug(record.release || 'unreleased')}.json`;
	anchor.click();
	URL.revokeObjectURL(anchor.href);
}

function setStatus(label: string): void {
	getElement('status').textContent = label;
}

function slug(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getElement<T extends HTMLElement = HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) throw new Error(`Missing device matrix element: ${id}`);
	return element as T;
}
