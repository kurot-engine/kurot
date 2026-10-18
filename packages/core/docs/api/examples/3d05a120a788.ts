import { ticker } from '@kurot/core';

let previous: number | undefined;
const onTick = (now: number): boolean => {
  const deltaSeconds = previous === undefined ? 0 : (now - previous) / 1000;
  previous = now;
  console.log(deltaSeconds);
  return false;
};
ticker.startTick(onTick, undefined);
ticker.stopTick(onTick, undefined);

export {};
