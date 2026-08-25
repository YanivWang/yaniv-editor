# Inline Toolbar

The Inline Editor controls toolbar and extension registration via `toolbar: InlineToolbarConfig`.

## Defaults

```ts
{ undoRedo: true, textFormat: true, link: true }
```

## All Switches

| Key           | Registered extensions                                       | Description                      |
| ------------- | ----------------------------------------------------------- | -------------------------------- |
| `undoRedo`    | StarterKit `undoRedo`                                       | Undo / redo                      |
| `heading`     | StarterKit `heading` (levels 1–6)                           | Heading levels                   |
| `textFormat`  | StarterKit `bold` / `italic` / `strike` + `Underline`       | Text formatting                  |
| `list`        | StarterKit `bulletList` / `orderedList` + TaskList/TaskItem | Ordered / unordered / task lists |
| `align`       | TextAlign (heading + paragraph)                             | Alignment                        |
| `link`        | Link extension + link bubble (`showLinkBubble`)             | Insert link                      |
| `clearFormat` | — (button only, no extra extension)                         | Clear formatting                 |
| `font`        | TextStyle + FontFamily + FontSize                           | Font family and size             |
| `codeBlock`   | codeBlockLowlight                                           | Code block                       |

**Rule**: when `toolbar.x !== true`, the corresponding button is hidden and the extension is not registered. Gates are derived by `resolveInlineGates` from the registry's `inlineToolbarSlugs`; `undoRedo` / `heading` / `clearFormat` share the `inline-starter` capability, which carries `inlineAlways: true`, so the StarterKit base is always registered and only its sub-extensions are gated.

Separately, a non-empty `placeholder` prop registers `inline-placeholder` (`YanivPlaceholder`), which is not controlled by `toolbar`.

## Example

```vue
<YanivInlineEditor
  v-model:content="html"
  mode="edit"
  placeholder="Write a comment…"
  :toolbar="{
    undoRedo: true,
    heading: true,
    textFormat: true,
    list: true,
    align: true,
    link: true,
    clearFormat: true,
    font: false,
    codeBlock: false,
  }"
/>
```

## Custom Slot

Use the `#toolbar` slot + atomic components to compose your own toolbar. See [Inline Composition](./inline-composition.md).

## Preview

Built-in toolbar and `#toolbar` slot are not rendered under `mode="preview"`.

## Related

- [YanivInlineEditor API](../api/yaniv-inline-editor.md)
- [Text Formatting](../features/text-formatting.md)
