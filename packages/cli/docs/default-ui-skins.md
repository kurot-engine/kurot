# Default KUI skins

This game-template refresh is included in published CLI 3.6.0, verified on npm
on 2026-10-10. CLI 3.5.0 contains the older atlas. The 2× kit requires published
Core ^2.5.0; actual published CLI scaffolding resolves that dependency.
The template owns the XML, textures and project colors; `@kurot/ui`
does not ship a bitmap theme or load a stylesheet itself.

## Visual language

Rounded corners, bright blue actions, pale neutral surfaces and a small pressed
button offset echo the Kurot mascot. The default is a light game interface:

| Role | Value |
| --- | --- |
| Action / selected outline | `#1487E8` |
| Action text / marks | `#071D30` |
| Canvas / panel | `#EDF3FC` / `#FFFFFF` |
| Input / neutral control | `#F1F5FC` |
| Text / secondary text | `#18273E` / `#64748B` |
| Disabled text | `#7C8799` |
| Button / input minimum height | 48 logical pixels |
| CheckBox / RadioButton / switch / slider minimum hit height | 44 logical pixels |

Buttons use 14-pixel corner radii and panels use 22. XML single-line labels
shrink within their allocated width, to a minimum of 14; editable text stays at
18. Fonts inherit the application's configured family. No browser CSS is used
to draw the components, and no runtime light/dark switching is introduced.

## Text and spacing

Single-line captions use `multiline="false" verticalAlign="middle"` with the
Core 2.5.0 ink-centering correction. Button label padding is 10 pixels
above/below; its down state uses 12/8 to retain a deliberate 2-pixel press offset.
The icon has the same neutral/down centers. Panel titles also opt into middle
alignment. Input text retains Core's stable font baseline while its placeholder
uses dynamic visual centering. No language-specific skin offsets are required.
See [Core text alignment](../../core/docs/text-layout.md#visual-centering-and-stable-baselines-core-250).
Published Core 2.4.0 does not contain that correction; the isolated preview uses
checkout Core for both text alignment and source density.

## Resources and XML

- `resource/assets/ui/kui/kui.json` and `kui.png`: Kurot-owned 512×512 atlas,
  generated at 2× with sheet `resolution: 2`. XML dimensions stay logical.
- `resource/default.res.json`: preload group `kui` and object-valued frame
  metadata. Qualified sources such as `kui.button_up` avoid bare-key collisions.
- `resource/ui/skins/*.kui.xml`: 15 native default component skins and
  `CloseButtonSkin`, used explicitly by Panel's `closeButton`.
- `resource/config/style.json`: named colors used by Label/EditableText state
  properties. Raster colors are baked into textures; changing text colors alone
  does not recolor the atlas.

Buttons provide up/down/disabled surfaces. CheckBox, RadioButton, ToggleButton
and ToggleSwitch cover all six selected/pressed/disabled combinations.
ItemRenderer supplies selected states for List and TabBar; ComboBox supplies
normal/open/disabled states and TextInput handles both prompt states when
enabled or disabled. Sliders supply a disabled thumb. Panel retains its drag
area, title and close button.

Skin part names and the native component APIs stay unchanged. The CLI compiles
source changes with a paired nine-slice grid from resource metadata, including
state transitions. Frames retain their full physical dimensions and never rotate
or trim; extrusion stays outside the recorded frame. Core divides original frame
dimensions/trim offsets by density; grids remain logical. Stretchable surfaces keep
their corners while the interior expands. Icons and switch handles remain fixed
size. Horizontal and vertical slider tracks have grids that fit their 8-pixel
thickness.

Scroller keeps `autoVisibility="false" visible="false"` on both bars. It retains
automatic scrolling policies and touch/trackpad scrolling. To display bars in a
project, edit those parts explicitly.

ItemRenderer backgrounds fit the allocated row width without extra horizontal
padding. The checkout Core also fixes fractional WebGL scissor bounds so scaled
Lists retain their right outline. Published Core 2.4.0 lacks that correction;
shrinking the skin or changing its nine-slice grid is not required.

Group, List, TabBar, ViewStack and text/image nodes are composed directly in XML;
their old default-Skin placeholders were not conventional Theme mappings and
are removed. Use `itemRendererSkinName` to choose a List/TabBar row appearance,
and wrap the node with Group/Image/Scroller for its surface and viewport.

## Native preview and maintenance

`examples/game/resource/ui/DefaultUISkin.kui.xml` contains the native gallery.
`src/DefaultUI.ts` only connects data and events. The example installs its own
project font loader and document dependency; other projects are unchanged.

Core 2.5.0 is published. Until the example adopts it, build Core/CLI for an isolated
source trial. The example's registry lock does not yet contain density support:

```sh
pnpm --dir packages/core build
pnpm --dir packages/cli build
pnpm --dir tools/default-ui-assets preview
```

The preview tool prints a new directory under docs-internal, with strict dev
and minified release builds. It links the built checkout Core and the example's
installed UI/Game/document packages; it does not edit application installations
or locks. Run the repository CLI dev command in that printed directory and open
the server URL with `?ui=1`. The ordinary game remains available without
that parameter. Try the inputs, switches, ComboBox, tabs, sliders, panel close
button and draggable List. The gallery is rendered by Core/UI from compiled
KUI XML. After explicitly installing the Core 2.5.0 release in the
example, ordinary repository-CLI builds can run directly from examples/game.

CLI 3.6.0 preserves constructor names in development and release
engine/namespace bundles so Theme lookup also works for self-referencing
classes such as Scroller. Published CLI 3.5.0 lacks the development correction.

`tools/default-ui-assets` contains editable SVG geometry and the reproducible
PNG/atlas generator. It uses registry `@kurot/atlas@0.1.0` only as private
repository tooling. CLI and runtime SDKs gain no atlas dependency. See its
[maintenance instructions](../../../tools/default-ui-assets/README.md).

Core 2.5.0 and CLI 3.6.0 are published; Core was published first.
UI/Game/document/runtime need no incidental release; existing 1× consumers keep
their behavior. See [density units and adoption](../../core/docs/texture-density.md).
Existing projects keep their own skins, resource keys and startup code. New
scaffolds receive this kit after the supporting Core and CLI publications;
installing a new CLI does not rewrite an existing project's resources.
