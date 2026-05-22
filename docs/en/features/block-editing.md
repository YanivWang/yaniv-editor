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

Under the `notion` scheme, partial Markdown shortcuts are supported:

- `[]` / `[x]` → task list
- `>` → callout block
- `---` → horizontal rule

## Line-Start Floating Menu

`full` and `notion` show `+` or format buttons at the start of empty lines, complementing the block menu.

## Preview Mode

Block menu and drag interactions are disabled in preview (`chromePolicy.showBlockPicker=false` + `isEditable` guards).

## Related

- [Feature Matrix](./feature-matrix.md)
- [Contextual UI](./contextual-ui.md)
