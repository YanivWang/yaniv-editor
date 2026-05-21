# YanivInlineEditor API

## Import

```ts
import { YanivInlineEditor } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";
```

## Props

| Prop              | Type                          | Default                        | Description                              |
| ----------------- | ----------------------------- | ------------------------------ | ---------------------------------------- |
| `content`         | `string`                      | `"<p></p>"`                    | HTML content, supports `v-model:content` |
| `mode`            | `"edit" \| "preview"`         | `"edit"`                       | Runtime state                            |
| `colorMode`       | `"light" \| "dark" \| "auto"` | `"light"`                      | Color mode                               |
| `toolbar`         | `InlineToolbarConfig`         | undo/redo + text format + link | Toolbar controls                         |
| `placeholder`     | `string`                      | none                           | Empty paragraph hint                     |
| `extraExtensions` | `AnyExtension[]`              | `[]`                           | Additional Tiptap extensions             |
| `editorProps`     | `Record<string, unknown>`     | none                           | Tiptap editor props                      |
| `locale`          | `string`                      | `"zh-CN"`                      | Locale code                              |

## Examples

```vue
<YanivInlineEditor v-model:content="html" mode="edit" />
<YanivInlineEditor :content="html" mode="preview" color-mode="auto" />
```

Custom toolbar:

```vue
<YanivInlineEditor
  v-model:content="html"
  :toolbar="{ undoRedo: true, textFormat: true, link: true, list: true }"
/>
```

In `mode="preview"`, the built-in toolbar and custom toolbar slot are not rendered. Content remains selectable, and links remain normal document links.

## Advanced Exports

The inline entry also exports building blocks for custom inline shells:

```ts
import {
  InlineToolbar,
  UndoRedoButton,
  LinkButton,
  buildExtensions,
  resolveInlineGates,
  resolveShowInlineToolbar,
  CAPABILITIES,
  provideYanivEditor,
  useYanivEditor,
} from "@yanivjs/yaniv-editor/inline";
```

See [Inline Composition](/guide/inline-composition) for a full custom-shell example.
