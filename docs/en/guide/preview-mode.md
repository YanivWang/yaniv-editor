# Preview Mode

`mode="preview"` is a content display state, not a separate branch architecture.

```vue
<YanivEditor mode="preview" preset="basic" :initial-content="html" />
<YanivInlineEditor :content="html" mode="preview" />
```

## Behavior

| Item                       | preview behavior    |
| -------------------------- | ------------------- |
| Content editing            | ❌ `editable=false` |
| Header / footer            | ❌ hidden           |
| Floating menu / block menu | ❌ hidden           |
| Contextual edit bars       | ❌ hidden           |
| Links                      | ✅ clickable        |
| Video                      | ✅ playable         |
| Scroll / selection         | ✅ normal           |

## Implementation Notes

- `chromePolicy.showEditChrome=false`; the whole edit chrome (header, footer, contextual bars, block menu) is unmounted with `v-if`
- Extension registration set **does not change** with phase; interaction extensions use `isEditable` guards + transaction filters
- `applyPhaseTransition` ordering is "edit → preview: emit first, then `setEditable(false)`; preview → edit: `setEditable(true)` first, then emit", so any subscriber cleanup command runs while `editable` is still true

::: tip There is currently only one phase subscriber
`EditorShell` subscribes to `onPhaseChange` and only calls `blockMenuHost.hide()` when switching to preview. Format painter and find/replace do **not** register phase cleanup callbacks — their state resets rely on their button components being unmounted together with the header. See [Format Painter](../features/format-painter.md#preview-transition) and [Find and Replace](../features/find-replace.md#preview-transition).
:::

## CSS Selector

Root node binds `data-phase="preview"` (legacy `.is-preview` class removed):

```css
.yaniv-editor[data-phase="preview"] .my-overlay {
  display: none;
}
```

## Related

- [Contextual UI](../features/contextual-ui.md)
- [Architecture — Phase Transition](../contributing/architecture.md#phase-transition)
