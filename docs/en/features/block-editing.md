# Block Editing

Notion-style block editing is driven by `slashCommand` and `dragHandle` capabilities, **enabled by default** on the `notion` preset.

```vue
<YanivEditor preset="notion" appearance="notion" />
```

You can also enable explicitly on other presets:

```vue
<YanivEditor preset="full" :features="{ slashCommand: true, dragHandle: true }" />
```

## Slash Command `/`

Type `/` on an empty line to open the block type menu with search filtering.

### Basic Blocks

Paragraph, headings H1–H3

### Lists

Ordered list, unordered list, task list

### Notion Blocks

| Block type   | Description                 | Shortcut                |
| ------------ | --------------------------- | ----------------------- |
| Callout      | Callout / tip box           | Type `> ` on empty line |
| Toggle list  | Expandable / collapsible    | Choose via `/`          |
| ColumnLayout | Two-column layout           | Choose via `/`          |
| Embed        | External link bookmark card | Choose via `/`          |
| Mention      | `@` user/entity             | Type `@`                |

### Advanced Blocks

Blockquote, code block, table, image, video, formula, horizontal rule

The block menu is filtered by gates and schema (e.g., table item hidden when `table` gate is off).

## Drag Handle

**Six-dot icon** on the left of each block:

- Click to open insert/action menu
- Drag to reorder blocks

## Markdown Input Rules

`NotionMarkdownInput` is registered by the `notionBlocks` capability, whose `featureKey` is **`slashCommand`** — so these rules come with `slashCommand`, not with the `notion` preset specifically:

| Input          | Result                                                                        |
| -------------- | ----------------------------------------------------------------------------- |
| `[] ` / `[x] ` | Task list (a space is required after the brackets; `[x]` is case-insensitive) |
| `> `           | Callout block (falls back to blockquote when the schema has no callout)       |
| `---`          | Horizontal rule (no trailing space needed)                                    |

StarterKit's own rules (`#`, `- `, `1. `, ` ``` `, …) work under every preset and are unaffected by this gate.

## Line-Start `+` Button

The `+` to the left of a paragraph (`drag-handle-plus`) is provided by the **dragHandle capability** and opens the insert menu. It is a different thing from the floating text menu:

| UI                                | Provided by                   | Trigger                                                  |
| --------------------------------- | ----------------------------- | -------------------------------------------------------- |
| Line-start `+` / six-dot handle   | the `dragHandle` gate         | hovering a block                                         |
| Floating text menu (FloatingMenu) | preset layout (full / notion) | a **non-empty text selection**; an empty cursor does not |

See [Contextual UI](./contextual-ui.md).

## Preview Mode

Block menu and drag interactions are disabled in preview (`chromePolicy.showBlockPicker=false` + `isEditable` guards).

## Related

- [Feature Matrix](./feature-matrix.md)
- [Contextual UI](./contextual-ui.md)
