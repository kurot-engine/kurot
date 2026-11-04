# Declared Skin fields

CLI 4 validates direct part access for UI 4. XML IDs remain the part names and
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
