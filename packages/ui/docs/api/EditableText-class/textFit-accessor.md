# textFit

Package: `@kurot/ui@3.6.1`. Generated from public declarations and JSDoc.

```ts
get textFit(): TextFitMode;
set textFit(value: TextFitMode);
```

Inherited from `textFit`; shown with this receiver's substituted types.

Font fitting mode, defaulting to none. shrink reduces laid-out text within
finite width/height bounds without changing multiline or the authored size.
Automatic axes do not constrain fitting. Invalid modes and shrink on
EditableText throw RangeError.

Related types: [TextFitMode](../TextFitMode-typealias.md).
