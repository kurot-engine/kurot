# Tween callback ownership

Available in Game 3.0.0 with Core ^3.0.0. The installed SDK declarations
establish the API for each release.

```ts
import { Tween } from '@kurot/game';

const sprite = { x: 0 };
const completed: unknown[][] = [];
const onComplete = (...args: unknown[]): void => {
    completed.push(args);
};

Tween.get(sprite)
    .to({ x: 100 }, 200)
    .call(onComplete, ['finished', 100]);
```

call(callback, params?) accepts an argument array in its second position.
It runs the callback without a receiver or a fallback to the tween target.
onChange and onLoopComplete also run unbound and receive the Tween argument.
TweenOptions has no onChangeObj/onLoopCompleteObj fields. Arrow callbacks or
functions bound once by their owner retain any needed instance state.

Call steps run during forward playback. Seeking and yoyo reverse passes skip
them. Update/loop timing, argument identity, synchronous errors and completion
or removal ownership retain their existing behavior. The shared Tween driver
and each ParticleSystem register stable functions with Core's ticker.
