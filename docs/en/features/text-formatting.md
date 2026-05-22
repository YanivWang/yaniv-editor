# Text Formatting

## Full Editor

All presets support basic text formatting. Entry points vary by preset:

| Capability                                | basic / full            | notion                                 |
| ----------------------------------------- | ----------------------- | -------------------------------------- |
| Bold / italic / underline / strikethrough | Header                  | Select text → line-start floating menu |
| Text color / highlight                    | Header color picker     | Floating menu                          |
| Headings H1–H6                            | Header heading dropdown | Type `/` → heading block               |
| Ordered / unordered / task lists          | Header                  | Type `/` or floating menu              |
| Alignment                                 | Header                  | Block menu / floating menu             |
| Clear formatting                          | Header                  | Floating menu / block menu             |
| Font family / size                        | full header             | —                                      |
| Superscript / subscript                   | full header             | —                                      |
| Format painter                            | full header             | — (disabled on notion)                 |

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
