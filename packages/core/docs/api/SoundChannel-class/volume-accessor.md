# volume

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
get volume(): number;
set volume(value: number);
```

Playback gain in [0, 1], initially 1. Assignments clamp to that interval.
Changing one channel does not change other channels created by the Sound.
