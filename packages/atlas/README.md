# @kurot/atlas

Version **0.1.0**, published to npm.

Independent, deterministic sprite-atlas tooling. Packs straight-alpha RGBA pixels
and outputs the flat `file`/`frames` sheet format consumed by Kurot. No dependency
on Core, UI, ui-document, ui-runtime or CLI; none of those packages depend on atlas.
It can be called by Reskin, Editor, a separate atlas tool or build automation.

## Entry points

- `@kurot/atlas`: pixel-only packing, portable ES2022, no Node or PNG imports.
- `@kurot/atlas/png`: synchronous Node.js >=20 PNG decoding/encoding through
  [pngjs](https://github.com/pngjs/pngjs), without native binaries.

The package performs no filesystem I/O. Callers own reading, source-image storage,
project-path validation, resource manifests, worker scheduling and atomic saves.
The PNG functions are synchronous; run larger batches in your tool's worker.

## PNG example

After installing/linking the package into a tool:

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { packPNGAtlas } from '@kurot/atlas/png';

const result = packPNGAtlas([
	{ name: 'r_btn_bet', png: await readFile('src/basis/r_btn_bet.png') },
	{ name: 'r_prg_thumb', png: await readFile('src/basis/r_prg_thumb.png') },
], { file: 'r_basis.png' });

// Demonstration only: a project editor must stage and commit the pair together.
await writeFile('export/r_basis.png', result.png);
await writeFile('export/r_basis.json', JSON.stringify(result.data, undefined, 2) + '\n');
```

Frame names are supplied explicitly and remain stable; the library does not
derive names from filesystem paths. Names start with an ASCII letter or digit,
followed by letters, digits, underscores, hyphens or dots. Duplicates are errors.
The `file` option is a PNG basename, resolved relative to the JSON by the consumer.

## Pixel example

```ts
import { packAtlas } from '@kurot/atlas';

const result = packAtlas([
	{ name: 'red', width: 1, height: 1, pixels: new Uint8Array([255, 0, 0, 255]) },
]);
// result.image contains width, height and RGBA pixels; result.data contains the sheet JSON.
```

Pixel input is row-major, four bytes per pixel, straight alpha, 8-bit channels.
Uint8Array and Uint8ClampedArray are accepted. Source arrays and buffers are not
modified. RGB in fully transparent output pixels is cleared; semitransparent
colors and alpha are retained without premultiplication or gamma correction.

## Packing contract

One sheet, no rotation, power-of-two dimensions, not necessarily square.
MaxRects placement uses a stable area/name sort and three heuristics. Candidate
sizes are tried by ascending area, then closeness to square, then width.
This is heuristic packing, not proof of an optimal layout; an overflow means
these searches did not fit within the requested limits. It does not reproduce
TexturePacker's exact placement or compressed PNG bytes.

| Option | Default | Contract |
| --- | --- | --- |
| `file` | `atlas.png` | PNG basename |
| `maxWidth`, `maxHeight` | 2048 | Integer 1–16384; output POT axes stay within bounds |
| `trim` | true | Crop transparent borders |
| `alphaThreshold` | 1 | Content alpha threshold, integer 1–255 |
| `trimMargin` | 1 | Retained source-pixel margin, clamped to original bounds |
| `extrude` | 1 | Copies nearest edge pixels, including corners, outside the frame |
| `shapePadding` | 0 | Empty right/bottom gap after each extruded rectangle |
| `borderPadding` | 0 | Empty outer sheet margin |
| `maxPixels` | 16777216 | Limits total decoded source area and output area |

Margin, extrusion and padding are integers 0–1024. maxPixels is an integer
1–67108864. Batches contain 1–4096 sources. PNG input has a 32 MiB per-file limit;
dimensions are checked before decoding a batch. Static PNG input is normalized to
RGBA8; APNG is rejected. The input buffers, decoder intermediates and output may
coexist, so maxPixels is not a process-wide memory quota.

Trimming tests alpha >= alphaThreshold, retains trimMargin around that bounding
box, then stores source offsets and original dimensions. Pixels below the
threshold inside the retained rectangle are preserved. An empty cropped source
becomes a clear 1×1 frame at source offset 0, retaining original logical dimensions.
Set trim=false when retaining the original canvas is required.

```json
{
	"file": "r_basis_icon.png",
	"frames": {
		"r_icon_bars": {
			"x": 1, "y": 1, "w": 56, "h": 43,
			"offX": 6, "offY": 11, "sourceW": 64, "sourceH": 64
		}
	}
}
```

Reported rectangles exclude extrusion and padding. Uncropped frames omit offset
and original-size fields. Sheet metadata does not include TexturePacker ownership,
smartupdate, pivots, rotation or multipack links.

## Errors and integration boundary

`AtlasError.code` is `invalid-input`, `invalid-options`, `invalid-png` or
`atlas-overflow`. Decode failures retain their cause. Overflow never produces a
partial result or automatically enables rotation/multipack.

Resource keys and logical sprite sizes, rather than packed coordinates, connect
the output to skins. Keep source files as project-owned authoring assets. Preserve
manifest object-form `subkeys`, groups and resource-default nine-slice metadata
when replacing a sheet; validate grids against original dimensions. The library
does not edit these records, KUI XML, style.json or game code. A caller must commit
PNG/JSON and any changed resource metadata consistently and refresh its caches.

Not included: source-folder scanning, `.tps` parsing, GUI, filesystem transactions,
sprite deduplication, multiple pages, rotation, JPEG/WebP output, polygon meshes,
automatic scaling or CLI integration.

## Development and validation

```sh
pnpm --dir packages/atlas install
pnpm --dir packages/atlas build
pnpm --dir packages/atlas test
```

Unit tests use synthetic images and do not require the local game checkout.
Initial local validation against the updated KUI sample on 2026-10-07 packed
all 29 basis and 32 basis_icon sources to 1024×1024 and 256×512 respectively.
All 61 frame field shapes and crop geometries match the existing export. Retained
RGBA pixels and edge/corner extrusion match the sources, and reversed source
order produces identical JSON and PNG bytes. CLI 3.3.0 development/release builds
accept the new resources without authored skin, manifest or stylesheet changes.
That validation does not promise identical layout to TexturePacker or replace
future Editor/Reskin integration and rendered-game acceptance.

To repeat local reference verification, provide the sample project root and a new
output directory outside that project:

```sh
pnpm --dir packages/atlas verify:reference /path/to/kurot-project-kui /tmp/atlas-new
```

See [reference results and checks](docs/reference-validation.md),
[CLI integration and optimization proposals](docs/cli-integration.md), and
[architecture and API context](docs/ai-context.md).
