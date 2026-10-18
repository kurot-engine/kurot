import { Tween, Ease } from '@kurot/game';

const sprite = { x: 0, alpha: 1 };
await Tween.get(sprite)
	.to({ x: 200, alpha: 0 }, 300, Ease.cubicOut)
	.wait(100);

export {};
