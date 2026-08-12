import { createPlayer } from '@kurot/core';
import {
	SkeletonAnimation,
	KurotAssetManager,
	SkeletonBinary,
	AtlasAttachmentLoader,
	TextureAtlas,
} from '@kurot/spine-4.3';

// ── Log helper ────────────────────────────────────────────────────────────────

const logEl = document.getElementById('log')!;
function log(msg: string, type: 'info' | 'error' | 'default' = 'default'): void {
	const line = document.createElement('div');
	line.className = `entry ${type}`;
	line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
	logEl.prepend(line);
}

// ── Setup Kurot player ──────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const app = createPlayer({
	canvas,
	frameRate: 60,
	contentWidth: 640,
	contentHeight: 480,
	background: '#0f0f1a',
});

// ── Load Spine assets ─────────────────────────────────────────────────────────

log('Loading assets...');

const mgr = new KurotAssetManager('assets/');
mgr.loadTextureAtlas('spineboy.atlas');
mgr.loadBinary('spineboy-pro.skel');

let spine: SkeletonAnimation | undefined;

function waitForLoad(): void {
	if (!mgr.isLoadingComplete()) {
		requestAnimationFrame(waitForLoad);
		return;
	}

	if (mgr.hasErrors()) {
		for (const [path, msg] of Object.entries(mgr.getErrors())) {
			log(`ERROR: ${path} — ${msg}`, 'error');
		}
		return;
	}

	log('Assets loaded. Building skeleton...', 'info');

	try {
		const atlas = mgr.require('spineboy.atlas') as TextureAtlas;
		const loader = new AtlasAttachmentLoader(atlas);
		const binary = new SkeletonBinary(loader);
		binary.scale = 0.4;

		const skelRaw = mgr.require('spineboy-pro.skel');
		const skelData = binary.readSkeletonData(skelRaw as Uint8Array);

		log(
			`Skeleton: ${skelData.animations.length} animations — ${skelData.animations.map(a => a.name).join(', ')}`,
			'info',
		);

		spine = new SkeletonAnimation(skelData);
		spine.x = 320;
		spine.y = 420;

		app.stage.addChild(spine);
		app.start();

		spine.play('idle', 0);
		log('Playing: idle');

		// Wire up buttons
		const anims: Record<string, string> = {
			'btn-idle': 'idle',
			'btn-walk': 'walk',
			'btn-run': 'run',
			'btn-jump': 'jump',
			'btn-shoot': 'shoot',
		};

		for (const [id, anim] of Object.entries(anims)) {
			document.getElementById(id)?.addEventListener('click', () => {
				if (!spine) return;
				spine.stopAll();
				spine.play(anim, 0);
				log(`Playing: ${anim}`, 'info');
			});
		}
	} catch (e) {
		log(`ERROR: ${(e as Error).message}`, 'error');
	}
}

requestAnimationFrame(waitForLoad);
