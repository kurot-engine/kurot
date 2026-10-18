# stop

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
stop(): void;
```

Idempotently stops this channel and releases its active audio nodes or
HTML playback handler. Manual stop suppresses SOUND_COMPLETE. The loaded
Sound and other channels remain usable; stop every channel owned by the view.
