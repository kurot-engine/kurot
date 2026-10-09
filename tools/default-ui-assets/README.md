# Default KUI assets

Private repository tooling for the CLI game template's native XML skin kit.
`src/frames.ts` owns SVG geometry and palette values; `src/generate.ts` rasterizes
them with pinned resvg and packs them with registry `@kurot/atlas@0.1.0`.
SVG geometry is in logical units, rasterized directly at 2× into a 512×512 atlas.
Sheet JSON records `resolution: 2`; grid coordinates remain logical.
Geometry is authored here; no EUI bitmap is reused. The engine and CLI runtime
do not depend on this tool.

```sh
pnpm --dir tools/default-ui-assets install --frozen-lockfile
pnpm --dir tools/default-ui-assets build
pnpm --dir tools/default-ui-assets generate
pnpm --dir packages/cli build
pnpm --dir packages/cli test
```

Generation updates committed atlas PNG/JSON and sheet metadata in the game
template and examples/game. It updates the template palette, then copies its
style/fonts and default XML skins to the example. Application code and the
example's gallery XML remain independently authored. No package version or
dependency range is changed by generation.

Keep frame dimensions, nine-slice grids and XML minimum dimensions coordinated.
Packing disables trimming and rotation and extrudes two physical pixels outside
every frame. Do not place a nine-slice cut through a corner that must remain fixed,
or make the fixed borders exceed a control's rendered thickness. Test widened
buttons, both slider orientations and selected/disabled state restoration in
the [native gallery](../../packages/cli/docs/default-ui-skins.md#native-preview-and-maintenance).

The kit inherits existing project fonts. Copied Chakra Petch files retain their
SIL OFL license. Texture colors are fixed at generation time; stylesheet text
colors compile separately, without a runtime palette switch.

## Isolated source preview

Published Core 2.5.0 supports source density, but the example lock is older.
Build the checkout Core
and CLI first, then `pnpm --dir tools/default-ui-assets preview` prepares an
isolated example under docs-internal, with both strict dev and minified release
output. The trial links the checkout Core and installed example UI/Game/document
packages explicitly. Original package declarations, installations and locks
remain registry-based. Run the repository CLI dev command in the printed trial
directory and open `?ui=1`. Core 2.5.0 and CLI 3.6.0 are published; see [texture density](../../packages/core/docs/texture-density.md).
