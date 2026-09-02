# Core Editing

Full Editor **core** extensions are always registered across presets and are not toggled via `FeatureConfig`.

## Text and Paragraphs

- Bold, italic, underline, strikethrough
- Headings H1–H6
- Paragraphs, blockquote, horizontal rule
- Ordered lists, unordered lists, task lists (nestable)
- Text color and background highlight (multicolor)
- Left / center / right / justify alignment

## Links

- Insert links from the header or floating menu
- A **link bubble menu** appears when a link is selected: edit the URL, open it in a new tab, remove the link

## Code Blocks

- Syntax highlighting: the lowlight `common` language pack (plus an `html` alias registered for `xml`)
- The language picker offers 20 common languages (`CODE_LANGUAGES`), defaulting to `javascript`
- full / notion: insert from header or `/`
- Code block language can be switched via the block badge (`CodeBlockLanguageBadge`)

## Font and Typography (full header)

- Font family and font size dropdowns (`full` preset)
- Superscript / subscript (`full` preset)
- **Line height**: no dedicated header button; can be copied via format painter or preserved in HTML

## Character Count

The footer (basic / full) shows character count, word count, and page count. Characters/words come from the CharacterCount extension; pages are estimated by `useEditorPagination`. The footer also provides a 50%–200% zoom control (step 10).

## Inline Editor

Inline controls available formats via the `toolbar` switch. Defaults are undo/redo + text format + link only. See [Inline Toolbar](../guide/inline-toolbar.md).
