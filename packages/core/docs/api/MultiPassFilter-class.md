# MultiPassFilter

Package: `@kurot/core@2.5.5`. Generated from public declarations and JSDoc.

```ts
class MultiPassFilter extends Filter
```

An immutable acyclic sequence of 1–32 GPU passes. Intermediate images are
borrowed only within one render; the renderer owns and recycles them.
Nested MultiPassFilter instances are intentionally not supported.

Related types: [Filter](Filter-class.md).

## Members

| Member | Scope | Reference |
| --- | --- | --- |
| `constructor` | public | [open](MultiPassFilter-class/constructor-constructor.md) |
| `paddingBottom` | protected, inherited | [open](MultiPassFilter-class/paddingBottom-property.md) |
| `paddingLeft` | protected, inherited | [open](MultiPassFilter-class/paddingLeft-property.md) |
| `paddingRight` | protected, inherited | [open](MultiPassFilter-class/paddingRight-property.md) |
| `paddingTop` | protected, inherited | [open](MultiPassFilter-class/paddingTop-property.md) |
| `passes` | public | [open](MultiPassFilter-class/passes-property.md) |
| `type` | public, inherited | [open](MultiPassFilter-class/type-property.md) |
| `uniforms` | public, inherited | [open](MultiPassFilter-class/uniforms-property.md) |
| `resolution` | public, inherited | [open](MultiPassFilter-class/resolution-accessor.md) |
| `getPadding` | public | [open](MultiPassFilter-class/getPadding-method.md) |
| `invalidate` | public, inherited | [open](MultiPassFilter-class/invalidate-method.md) |
| `onPropertyChange` | public, inherited | [open](MultiPassFilter-class/onPropertyChange-method.md) |
| `toJson` | public, inherited | [open](MultiPassFilter-class/toJson-method.md) |
| `updatePadding` | protected, inherited | [open](MultiPassFilter-class/updatePadding-method.md) |
