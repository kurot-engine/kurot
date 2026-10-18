# buttonReleased

Package: `@kurot/ui@3.6.2`. Generated from public declarations and JSDoc.

```ts
protected buttonReleased(): void;
```

Extension hook: protected; available to subclasses.

Called when the user taps the button (touch ends within the button bounds).
Subclasses should override this to perform the button action.
The base implementation handles toggle behavior.
