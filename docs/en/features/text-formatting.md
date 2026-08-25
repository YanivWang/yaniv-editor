# Text Formatting

## Full Editor

All presets support basic text formatting. Entry points vary by preset:

| Capability                                | basic / full            | notion                             |
| ----------------------------------------- | ----------------------- | ---------------------------------- |
| Bold / italic / underline / strikethrough | Header                  | Select text → floating menu        |
| Text color / highlight                    | Header color picker     | Floating menu                      |
| Headings H1–H6                            | Header heading dropdown | Floating menu or `/` heading block |
| Ordered / unordered / task lists          | Header                  | Floating menu or `/`               |
| Link                                      | Header                  | Floating menu                      |
| Alignment                                 | Header                  | **No entry point** (see below)     |
| Clear formatting                          | Header                  | **No entry point** (see below)     |
| Font family / size                        | full header             | —                                  |
| Superscript / subscript                   | full header             | —                                  |
| Format painter                            | full header             | — (disabled on notion)             |

The floating menu (`FloatingMenu`) appears only when there is a **non-empty text selection**, positioned near that selection; an empty cursor never triggers it. It contains: heading dropdown, bold/italic/underline/strike, text color and highlight, link, lists, and — when the AI gate is on — `AiMenuButton`.

::: warning notion has no alignment or clear-formatting entry point
`AlignDropdown` and `ClearFormatButton` live only in the header (`ToolbarNav`), which `notion` hides. The floating menu does not include them, and neither does the block menu (`/`) or the drag menu (duplicate block / delete block / transform to). The TextAlign extension is still registered and reachable via commands or shortcuts, but there is no built-in button.
:::

```vue
<YanivEditor preset="basic" />
<YanivEditor preset="full" />
<YanivEditor preset="notion" appearance="notion" />
```

## Inline Editor

`textFormat` is enabled by default (bold, italic, underline, strikethrough). You can add `heading`, `list`, `align`, `font`, `clearFormat`, and more.

```vue
<YanivInlineEditor
  v-model:content="html"
  :toolbar="{ undoRedo: true, textFormat: true, link: true, list: true, align: true }"
/>
```

## Related

- [Core Editing](./core-editing.md)
- [Format Painter](./format-painter.md)
- [Inline Toolbar](../guide/inline-toolbar.md)
