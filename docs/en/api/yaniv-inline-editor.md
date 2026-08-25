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
| `zIndexBase`      | `number`                      | `1000`                         | Overlay z-index base; no session rebuild |

Changing `placeholder` or `extraExtensions` updates `sessionKey` and triggers session rebuild (content is snapshotted first).

See [Z-Index & Overlays](../guide/z-index.md) for overlay mounting and tokens.

## Events

| Event            | Payload  | Description                                              |
| ---------------- | -------- | -------------------------------------------------------- |
| `update:content` | `string` | Emitted on the editor's `update` with `editor.getHTML()` |

`content` + `update:content` form `v-model:content`. Inline's content protocol is an **HTML string**; it does not accept `JSONContent`.

## Slots

| Slot      | Scope                                                     | Description                                                              |
| --------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `toolbar` | `{ editor: Editor \| null, config: InlineToolbarConfig }` | Replaces the built-in `InlineToolbar`; omitted, the built-in one renders |

```vue
<YanivInlineEditor v-model:content="html">
  <template #toolbar="{ editor, config }">
    <InlineToolbar v-if="editor && config" :editor="editor" :config="config" />
  </template>
</YanivInlineEditor>
```

The slot renders only when `chromePolicy.showInlineToolbar` is true — that is, `mode="edit"` **and** at least one registry-declared slug in `toolbar` is `true`.

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

See [Inline Composition](../guide/inline-composition.md) for a full custom-shell example.
