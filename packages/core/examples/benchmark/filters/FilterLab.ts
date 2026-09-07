import { createPlayer, Sprite, BloomFilter, BlurFilter, GlowFilter, CustomFilter } from '../../../src/index.js';
import type { Filter } from '../../../src/index.js';
import type { GL } from '../../../src/kurot/player/webgl/WebGLUtils.js';
import { createFilterScene } from './FilterScene.js';

const select = (id: string): HTMLSelectElement => document.querySelector<HTMLSelectElement>(`#${id}`)!;
const button = (id: string): HTMLButtonElement => document.querySelector<HTMLButtonElement>(`#${id}`)!;
const status = document.querySelector<HTMLElement>('#status')!;
const backend = select('backend');
backend.value = new URLSearchParams(location.search).get('backend') === 'webgl1' ? 'webgl1' : 'webgl2';
backend.onchange = (): void => { location.search = `backend=${backend.value}`; };
const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const gl = canvas.getContext(backend.value === 'webgl1' ? 'webgl' : 'webgl2') as GL | null;
if (!gl) {
	status.textContent = `${backend.value} 不可用，请切换后端。`;
	throw new Error('Requested WebGL backend unavailable');
}
const gpu: GL = gl;
const app = createPlayer({ canvas, contentWidth: 960, contentHeight: 320, resolution: 1 });
const root = new Sprite();
const left = createFilterScene(), right = createFilterScene();
left.world.x = 20; left.world.y = 20; right.world.x = 500; right.world.y = 20;
root.addChild(left.world); root.addChild(right.world);
app.start(root); app.stop();
app.player.updateStageSize(960, 320, 960, 320);
const bloom = new BloomFilter({ blur: 12, threshold: 0.65 });
const blur = new BlurFilter(12, 12);
const glow = new GlowFilter(0x8affd3, 1, 12, 12, 2, 1, false, true);
const body = 'vec4 c = SAMPLE(uSampler,vTextureCoord); vec2 p = floor(vTextureCoord*vec2(110.0,70.0)); float n = fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); OUTPUT = c * step(amount,n);';
const dissolve = CustomFilter.from({
	webgl1: { fragment: `precision highp float; varying vec2 vTextureCoord; uniform sampler2D uSampler; uniform float amount; void main(){${body.replaceAll('SAMPLE', 'texture2D').replaceAll('OUTPUT', 'gl_FragColor')}}` },
	webgl2: { fragment: `#version 300 es\nprecision highp float; in vec2 vTextureCoord; uniform sampler2D uSampler; uniform float amount; out vec4 result; void main(){${body.replaceAll('SAMPLE', 'texture').replaceAll('OUTPUT', 'result')}}` },
	uniforms: { amount: 0.45 },
});
const amount = document.querySelector<HTMLInputElement>('#amount')!;
const descriptions: Record<string, string> = {
	bloom: 'Bloom：提取亮部 → 低分辨率模糊 → 与原图合成。观察路灯、窗户和萤火的光晕；当前为 LDR 效果。',
	blur: 'Blur：半径可调至 64，quality 控制 pass 对数。大半径会降采样后模糊，再恢复输出尺寸。',
	glow: 'Glow knockout：去掉输入本体，只显示向外扩展的发光。暗色背景用于观察透明输出。quality 不参与此效果。',
	dissolve: 'CustomFilter：用 uniform 控制像素块溶解。拖动参数观察原位更新，不需要重新挂载滤镜。quality 不参与此效果。',
};
function configure(): void {
	const n = Number(amount.value) / 100, quality = Number(select('quality').value);
	bloom.intensity = n * 3; bloom.quality = quality;
	blur.blurX = blur.blurY = n * 64; blur.quality = quality;
	glow.strength = n * 4;
	dissolve.setUniform('amount', n);
	const effects: Record<string, Filter> = { bloom, blur, glow, dissolve };
	right.world.filters = [effects[select('effect').value]];
	document.querySelector('#value')!.textContent = amount.value;
	document.querySelector('#description')!.textContent = descriptions[select('effect').value];
}
select('effect').onchange = configure; select('quality').onchange = configure; amount.oninput = configure;
configure();
let paused = false, measuring = false, time = 0, previous = performance.now(), draws = 0, allocations = 0;
const draw = gpu.drawElements.bind(gpu), createTexture = gpu.createTexture.bind(gpu);
gpu.drawElements = (...args: Parameters<GL['drawElements']>): void => { draws++; draw(...args); };
gpu.createTexture = (): ReturnType<typeof createTexture> => { allocations++; return createTexture(); };
button('pause').onclick = (): void => { paused = !paused; button('pause').textContent = paused ? '继续动画' : '暂停动画'; };
function renderFrame(t: number): void {
	left.sparks.y = right.sparks.y = Math.sin(t) * 8;
	left.sparks.x = right.sparks.x = Math.cos(t * 0.7) * 4;
	draws = 0; app.player.render(true, 0);
}
function tick(now: number): void {
	if (!measuring) {
		if (!paused) time += Math.min(now - previous, 50) / 1000;
		renderFrame(time);
		status.textContent = `${backend.value.toUpperCase()} · 960 × 320 · Draw calls ${draws} · 空闲纹理池 ${app.player.framebufferPoolSize} / ${(app.player.framebufferPoolBytes / 1048576).toFixed(2)} MiB`;
	}
	previous = now; requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
interface Result { name: string; medianMs: number; p95Ms: number; draws: number; newTextures: number; poolCount: number; poolMiB: number }
let report: object | undefined;
const nextFrame = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => resolve()));
button('measure').onclick = async (): Promise<void> => {
	measuring = true;
	const controls = [...document.querySelectorAll<HTMLButtonElement | HTMLSelectElement | HTMLInputElement>('button,select,input')];
	controls.forEach(control => { control.disabled = true; });
	left.world.visible = false;
	const cases: { name: string; filters: Filter[] }[] = [
		{ name: '无滤镜', filters: [] }, { name: 'Blur 8 / Q1', filters: [new BlurFilter(8, 8)] },
		{ name: 'Blur 64 / Q1', filters: [new BlurFilter(64, 64)] },
		{ name: 'Blur 16 / Q4', filters: [new BlurFilter(16, 16, 4)] },
		{ name: 'Bloom 12 / Q1', filters: [new BloomFilter({ blur: 12 })] },
	];
	const results: Result[] = [];
	try {
		for (const scenario of cases) {
			status.textContent = `测量中：${scenario.name}…`;
			right.world.filters = scenario.filters;
			for (let i = 0; i < 20; i++) { renderFrame(i / 60); gpu.finish(); }
			await nextFrame();
			const times: number[] = [], before = allocations;
			for (let i = 0; i < 60; i++) {
				const start = performance.now(); renderFrame(i / 60); gpu.finish(); times.push(performance.now() - start);
				if (i % 10 === 9) await nextFrame();
			}
			if (gpu.getError() !== gpu.NO_ERROR) throw new Error('WebGL error during benchmark');
			times.sort((a, b) => a - b);
			results.push({ name: scenario.name, medianMs: (times[29] + times[30]) / 2, p95Ms: times[56], draws,
				newTextures: allocations - before, poolCount: app.player.framebufferPoolSize, poolMiB: app.player.framebufferPoolBytes / 1048576 });
		}
		const max = Math.max(...results.map(result => result.medianMs), 0.01);
		document.querySelector('#results')!.innerHTML = results.map(r => `<tr><td>${r.name}</td><td>${r.medianMs.toFixed(2)} / ${r.p95Ms.toFixed(2)}<div class="bar" style="width:${r.medianMs / max * 100}%"></div></td><td>${r.draws}</td><td>${r.newTextures}</td><td>${r.poolCount} / ${r.poolMiB.toFixed(2)}</td></tr>`).join('');
		report = { backend: backend.value, date: new Date().toISOString(), userAgent: navigator.userAgent, canvas: [960, 320], scene: [440, 280], warmup: 20, samples: 60, timing: 'render + gl.finish; milliseconds; not FPS', results };
	} catch (error) {
		document.querySelector('#results')!.textContent = String(error);
	} finally {
		left.world.visible = true; configure(); measuring = false;
		controls.forEach(control => { control.disabled = false; }); button('download').disabled = !report;
	}
};
button('download').onclick = (): void => {
	const url = URL.createObjectURL(new Blob([JSON.stringify(report, undefined, 2)], { type: 'application/json' }));
	const link = document.createElement('a'); link.href = url; link.download = `kurot-filters-${backend.value}.json`; link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
};
window.addEventListener('pagehide', () => app.destroy(), { once: true });
