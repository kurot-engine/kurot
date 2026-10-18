import { TweenGroup } from '@kurot/game';

const button = { alpha: 1 };
const group = new TweenGroup('ui');
group.get(button).to({ alpha: 0 }, 200);
group.pause();
group.resume();
group.removeAll();

export {};
