# Word Import and Export

Word tools belong to the **full preset header**, independent of the `appearance="word"` visual skin.

```vue
<YanivEditor preset="full" />
<YanivEditor preset="full" appearance="word" />
```

## Import

- Format: `.docx`
- Implementation: mammoth → HTML → `setContent`
- Supports: Heading 1–6 style mapping, links (sanitize + `target=_blank`)

Header Word button → import modal with drag-and-drop upload.

## Export

- Output: `.docx` (docx + file-saver)
- Supports: H1–H6, paragraph alignment, bold/italic/underline/strikethrough, superscript/subscript, links, ordered/unordered lists (nested), tables, code blocks, blockquote, hr

Header Word button → export modal with optional filename.

## vs Office Paste

| Capability | Word import/export | Office paste       |
| ---------- | ------------------ | ------------------ |
| Control    | full header        | `officePaste` gate |
| Scenario   | Whole `.docx` file | Clipboard Ctrl+V   |
| notion     | ❌                 | ✅                 |

## Related

- [Office Paste](./office-paste.md)
