# Bitmap font package

Read docs/ai-context.md and docs/format.md first. Follow ../../docs/code-rules.md.
This is a headless kernel with no runtime dependencies. Keep source portable and
Node/DOM/Canvas/image decoding outside src. All public APIs use named exports.
Font geometry changes require layout tests and Core rendering verification.
Editor source assets and history belong to a separate project format.
