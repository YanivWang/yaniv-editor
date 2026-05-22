# YanivEditor API

## Import

```ts
import { YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
```

## Props

| Prop                   | Type                                          | Default                        | Description                         |
| ---------------------- | --------------------------------------------- | ------------------------------ | ----------------------------------- |
| `mode`                 | `"edit" \| "preview"`                         | `"edit"`                       | Runtime state                       |
| `preset`               | `"basic" \| "full" \| "notion"`               | `"basic"`                      | Full Editor feature plan            |
| `appearance`           | `"default" \| "word" \| "notion" \| "custom"` | `"default"`                    | Visual skin                         |
| `colorMode`            | `"light" \| "dark" \| "auto"`                 | `"light"`                      | Color mode                          |
| `features`             | `FeatureConfig`                               | preset defaults                | Ability overrides                   |
| `initialContent`       | `string \| JSONContent`                       | `"<p>开始编辑你的文档...</p>"` | Initial document                    |
| `customAppearanceVars` | `Record<string, string>`                      | none                           | CSS variables for custom appearance |
| `uploadImage`          | `(file: File) => Promise<string>`             | DataURL fallback               | Image upload handler                |
| `uploadVideo`          | `(file: File) => Promise<string>`             | DataURL fallback               | Video upload handler                |
| `galleryImages`        | `GalleryImage[]`                              | current document images        | External gallery source             |
| `customTemplates`      | `TemplateItem[]`                              | built-in templates             | Extra templates                     |
| `locale`               | `string`                                      | `"zh-CN"`                      | Locale code                         |
| `aiConfig`             | `YanivEditorAiConfig`                         | none                           | Host-owned AI config                |

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
