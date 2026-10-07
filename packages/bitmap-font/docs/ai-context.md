# @kurot/bitmap-font — AI context

Version 0.1.0. Pure TypeScript / ESM / ES2022 with no runtime
dependencies or DOM typings. See [format.md](format.md) before changing imports,
validation, geometry or layout.

Version 0.1.0 and its consumer Core 2.2.0 are published. Published UI 3.2.0
adds BitmapLabel and requires Core ^2.2.0, without local dependency overrides.
Published UI 3.1.0 does not contain the component.

| File                | Responsibility                                                 |
| ------------------- | -------------------------------------------------------------- |
| src/types.ts        | Version-1 interchange, glyphs and layout contracts             |
| src/validation.ts   | Strict native validation and frozen snapshot construction      |
| src/parse-egret.ts  | Egret frames JSON normalization                                |
| src/parse-bmfont.ts | Single-page BMFont text normalization                          |
| src/parse.ts        | Public format detection and deterministic native serialization |
| src/layout.ts       | Code-point wrapping, kerning, line metrics and painted bounds  |
| src/index.ts        | Named public exports only                                      |

Public functions: parseBitmapFont, validateBitmapFont, serializeBitmapFont,
layoutBitmapText. Public types are listed in README.md.

Atlas pixels are not decoded here; Core manages textures and resource loading.
This package never imports Core/UI/Atlas. A future editor can consume it without
installing the game engine. Parsing returns deeply frozen data; editor changes
are made to caller-owned records and validated into a new snapshot.

Offsets may be negative and xAdvance may be zero. Do not use a truthiness fallback
for font metrics. Character keys are Unicode scalars; layout indices are UTF-16
source offsets. Height constraints admit complete lines and are independent of
painted glyph overhang. Layout assumes already validated font data.

Commands run from this package: pnpm install/build/test/format. Tests run in Node,
not a DOM emulator. Do not add browser or filesystem APIs to src.
