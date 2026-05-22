# Inline Toolbar

The Inline Editor controls toolbar and extension registration via `toolbar: InlineToolbarConfig`.

## Defaults

```ts
{ undoRedo: true, textFormat: true, link: true }
```

## All Switches

| Key           | Extension / UI               | Description                      |
| ------------- | ---------------------------- | -------------------------------- |
| `undoRedo`    | StarterKit history           | Undo / redo                      |
| `heading`     | StarterKit heading           | Heading levels                   |
| `textFormat`  | bold/italic/underline/strike | Text formatting                  |
| `list`        | TaskList                     | Ordered / unordered / task lists |
| `align`       | TextAlign                    | Alignment                        |
| `link`        | Link + link bubble           | Insert link                      |
| `clearFormat` | —                            | Clear formatting                 |
| `font`        | FontFamily + FontSize        | Font family and size             |
| `codeBlock`   | codeBlockLowlight            | Code block                       |

**Rule**: when `toolbar.x !== true`, the corresponding button is hidden and the extension is not registered.

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
