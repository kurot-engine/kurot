import { Timer, TimerEvent } from '@kurot/core';

const timer = new Timer(1000, 30);
const onSecond = (): void => { console.log(timer.currentCount); };
timer.addEventListener(TimerEvent.TIMER, onSecond);
timer.start();
function disposeRoundTimer(): void {
  timer.stop();
  timer.removeEventListener(TimerEvent.TIMER, onSecond);
}
disposeRoundTimer();

export {};
