# Declared Skin fields

CLI 4 validates direct part access for UI 4 and 5. XML IDs remain the part names and
business classes declare the fields they use:

```ts
import { Component } from '@kurot/ui';
import type { Button } from '@kurot/ui';

export class AlertPanel extends Component<'views.AlertPanelSkin'> {
  declare btnClose: Button;
}
```

Application code uses `panel.btnClose`. Component owns runtime binding and
cleanup; see the [UI field contract](../../ui/docs/skin-part-fields.md).

## Build checks

The CLI reads TypeScript syntax and installed SDK declarations without executing
project code. It resolves configured component pairs, literal skinName assignments,
literal generic names/unions and unambiguous ClassNameSkin conventions.

For those associations it checks required/optional and inherited declarations,
authored node assignability, emitted-field initializers, host methods/accessors
and engine-member collisions. Native SDK slots are identified by their `@skinPart`
declarations and retain their own accepted types. Direct fields require the UI 4
runtime contract; type declarations alone cannot provide runtime binding.

Failures produce KUROT_KUI_PART_BINDING_INVALID with source positions when
available. Development and release builds reject the input before replacing the
Skin bundle or `.kurot/skin-parts.d.ts`. Generated declarations still describe the
full part set for tooling; they do not silently add fields to business classes.

## Development watching

Application and namespace source rebuilds rerun these checks against the latest
installed Skin set, including edits outside convention-based component directories.
Failed rebuilds retain the last good JavaScript and declarations. Correcting KUI
retries blocked source contexts; browser refresh remains manual.

The CLI uses TypeScript as a Node-side runtime dependency for these checks.
Application code and SDK implementations are not evaluated by the checker. This
targeted contract validation does not replace the project's complete
`tsc --noEmit --skipLibCheck false` check.

## Typed list fields

With UI 4.2.x or 5.x and CLI >= 4.1.1 within 4.x, a host may
declare `items: List<ItemData | null>` for an authored `<List id="items" />`.
The checker permits the unknown business-data parameter to follow that
declaration. No XML generic syntax is introduced.

The exception resolves actual installed SDK exports for DataGroup, ListBase, List,
TabBar, ComboBox and ItemRenderer through TypeScript symbol identity. It only
applies to an unknown source item parameter. Generic constructor assignability
still checks native control type and inheritance; other arguments, including
ItemRenderer's first Skin parameter, retain their assignability checks. It does
not admit unrelated controls, extra required members, lookalike project classes
or a mismatching concrete source item type. Optional field/union handling retains
the normal TypeScript rules.

Business data arguments remain the application's contract: XML does not infer or
validate those item values. The generated part map retains its XML-derived types;
direct host fields carry the application's chosen data types. Required parts,
initializers, member conflicts and native slots continue to be checked.

Skin association discovery also distinguishes SDK data-only generics from Skin
arguments. For named/namespace imports from @kurot/ui, List/collection/event data
literals are not Skin names; ItemRenderer keeps only its first argument as TSkin.
Project-defined base-class discovery retains its existing behavior.
