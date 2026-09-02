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

::: warning What export covers
The export pipeline (`wordExport.ts`) maps the tags of `getHTML()` one by one; anything it does not handle explicitly falls back to "recurse if it has children, drop otherwise":

- **Lost entirely**: images, video, math formulas and embed cards — they render as `<img>` / `<video>` / empty `<span>` / empty `<div>` with no text content.
- **Text kept, structure lost**: toggle / callout / column containers are flattened into plain paragraphs; a mention keeps its `@name` text but loses the pill styling.
- **Downgraded**: a horizontal rule becomes a row of `─` characters rather than a real Word separator; blockquotes are emulated with a left indent plus a left border.
  :::

## vs Office Paste

| Capability | Word import/export | Office paste       |
| ---------- | ------------------ | ------------------ |
| Control    | full header        | `officePaste` gate |
| Scenario   | Whole `.docx` file | Clipboard Ctrl+V   |
| notion     | ❌                 | ✅                 |

## Related

- [Office Paste](./office-paste.md)
