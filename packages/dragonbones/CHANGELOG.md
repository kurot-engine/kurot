# Changelog

## 0.1.0 — 2026-10-08

- Add the official DragonBones 5.7.000 TypeScript runtime adapted to ESM, with
  the original commit, source hashes and MIT notices recorded for provenance.
- Add KurotFactory, armature display proxies, native Mesh slots and borrowed
  atlas-region views.
- Support JSON / DBDT skeletons, rotated and trimmed regions, weighted and
  unweighted deformation, nested armatures, event forwarding, automatic and
  manual clocks, and repeatable disposal.
- Handle disposal from animation callbacks and refresh native textures when
  an attachment's replacement atlas changes.
- Add adapter tests, frame-by-frame project-resource verification and a
  WebGL / Canvas 2D example.
- Require only Core ^2.1.1 at runtime; use published Core 2.2.0 for development
  without local overrides. UI and Game are not dependencies.
- Maintain source in packages/dragonbones/src/runtime and compile it directly
  with the adapter to dist, without generated source-directory intermediates
  or a separate vendor build.
