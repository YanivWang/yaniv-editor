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

- `chromePolicy.showEditChrome=false`
- Extension registration set **does not change** with phase; interaction extensions use `isEditable` guards + transaction filters
- Before switching to preview: emit phase event to clear format painter, find/replace, etc., then `setEditable(false)`

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
