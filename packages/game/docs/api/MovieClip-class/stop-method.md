# stop

Package: `@kurot/game@2.0.1`. Generated from public declarations and JSDoc.

```ts
stop(): void;
```

Stop on the current frame without dispatching COMPLETE. Stage removal also
stops playback. The game must detach its own scheduler/listeners separately;
this method does not dispose borrowed frame data or textures.
