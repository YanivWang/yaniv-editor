# YanivEditor API

## Import

```ts
import { YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
```

## Props

| Prop                     | Type                                          | Default                        | Description                                                      |
| ------------------------ | --------------------------------------------- | ------------------------------ | ---------------------------------------------------------------- |
| `mode`                   | `"edit" \| "preview"`                         | `"edit"`                       | Runtime state                                                    |
| `preset`                 | `"basic" \| "full" \| "notion"`               | `"basic"`                      | Full Editor feature plan                                         |
| `appearance`             | `"default" \| "word" \| "notion" \| "custom"` | `"default"`                    | Visual skin                                                      |
| `colorMode`              | `"light" \| "dark" \| "auto"`                 | `"light"`                      | Color mode                                                       |
| `features`               | `FeatureConfig`                               | preset defaults                | Ability overrides                                                |
| `initialContent`         | `string \| JSONContent`                       | `"<p>开始编辑你的文档...</p>"` | Initial document                                                 |
| `customAppearanceVars`   | `Record<string, string>`                      | none                           | CSS variables for custom appearance (visual tokens, not z-index) |
| `zIndexBase`             | `number`                                      | `1000`                         | Overlay z-index base; sets `--ye-z-base`; no session rebuild     |
| `uploadImage`            | `(file: File) => Promise<string>`             | `blob:` object URL fallback    | Image upload handler                                             |
| `uploadVideo`            | `(file: File) => Promise<string>`             | `blob:` object URL fallback    | Video upload handler                                             |
| `galleryImages`          | `GalleryImage[]`                              | current document images        | External gallery source                                          |
| `customTemplates`        | `TemplateItem[]`                              | built-in templates             | Extra templates                                                  |
| `mentionItems`           | `MentionItem[]`                               | built-in placeholder data      | `@` mention suggestions; requires the `slashCommand` capability  |
| `locale`                 | `string`                                      | `"zh-CN"`                      | Locale code                                                      |
| `defaultOutlineExpanded` | `boolean`                                     | `false`                        | Initial outline panel when outline gate is on                    |
| `aiConfig`               | `YanivEditorAiConfig`                         | none                           | Host-owned AI config                                             |

See [Z-Index & Overlays](../guide/z-index.md) for `zIndexBase` and overlay mounting.

Despite its name, `initialContent` is also a **controlled source**: `useControlledContent` watches it and, when the incoming value differs from the current document signature, writes it back through `ContentAdapter.setContent` (with `addToHistory: false`). So `:initial-content="doc" @update="doc = $event"` is a valid controlled pattern — signature de-duplication prevents the emit round-trip from moving the caret.

## Events

| Event    | Payload       | Description                                                                    |
| -------- | ------------- | ------------------------------------------------------------------------------ |
| `update` | `JSONContent` | Emitted on the editor's `update` with the current document as ProseMirror JSON |

```vue
<YanivEditor :initial-content="doc" @update="doc = $event" />
```

Full Editor's content protocol is **JSON**. `initialContent` accepts an HTML string or `JSONContent`, but `@update` always emits `JSONContent`.

## Examples

```vue
<YanivEditor mode="edit" preset="basic" appearance="word" color-mode="auto" />
<YanivEditor mode="preview" preset="basic" appearance="word" color-mode="auto" />
<YanivEditor mode="edit" preset="notion" appearance="notion" color-mode="light" />
<YanivEditor appearance="custom" :custom-appearance-vars="{ '--ye-primary': '#6366f1' }" />
```

## Expose

```ts
interface YanivEditorExpose {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | null;
  getHTML: () => string;
  getText: () => string;
}
```

## Advanced Exports

For custom shells and advanced integration, the root package also exports:

- `resolveEditorProfile`, `mergeFeatures`, `resolveChromePolicy`, `computeSessionKey`
- `buildExtensions`, `CAPABILITIES`, `applyGatesToToolbarConfig`, `resolveShowInlineToolbar`
- `ContentAdapter`, `applyPhaseTransition`

See [Composables](./composables.md) for details.
