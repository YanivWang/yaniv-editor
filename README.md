# Yaniv Editor

English | [简体中文](./README.zh-CN.md)

Vue 3 + Tiptap 3 rich-text editor library (**v0.1.0**).

| Shape               | Import                         | Use case                       |
| ------------------- | ------------------------------ | ------------------------------ |
| `YanivEditor`       | `@yanivjs/yaniv-editor`        | Documents, CMS, knowledge base |
| `YanivInlineEditor` | `@yanivjs/yaniv-editor/inline` | Comments, forms                |
| AI (optional)       | `@yanivjs/yaniv-editor/ai`     | AI extensions & UI             |

Full API reference and guides live in [`docs/`](./docs/index.md) ([live docs](https://yanivwang.github.io/yaniv-editor/) · `pnpm docs:dev` for local). [Live demo](https://yanivwang.github.io/yaniv-editor/examples/). Breaking changes and migration: [`CHANGELOG.md`](./CHANGELOG.md). Architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Install

Peer dependencies are required (`vue` ^3.4, `@tiptap/*` ^3.0, `ant-design-vue` ^4.0, and others — see `package.json` → `peerDependencies`).

```bash
pnpm add @yanivjs/yaniv-editor vue @tiptap/core @tiptap/vue-3 @tiptap/starter-kit @tiptap/pm ant-design-vue
# Install remaining @tiptap/* peers from package.json as needed for your preset/features.
```

After installing peer dependencies, you can use the editor **without** `app.use(Antd)` or any extra global Ant Design Vue registration in the host app (components register antd locally). This also applies to Nuxt projects using `@ant-design-vue/nuxt`.

### Entry points

```ts
// Full editor
import { YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";

// Inline editor
import { YanivInlineEditor } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";

// AI (optional)
import { ContinueWritingExtension, AiMenuButton, useAiConfig } from "@yanivjs/yaniv-editor/ai";
```

## Quick start

### Full Editor (JSON content)

Full Editor emits and accepts **ProseMirror JSON** (`@update`). You may pass `initialContent` as HTML or JSON.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
import type { JSONContent } from "@tiptap/core";

const doc = ref<JSONContent | undefined>();
</script>

<template>
  <YanivEditor
    mode="edit"
    preset="basic"
    appearance="default"
    color-mode="light"
    @update="doc = $event"
  />
</template>
```

Custom appearance (instance-scoped CSS variables):

```vue
<YanivEditor appearance="custom" :custom-appearance-vars="{ '--ye-primary': '#6366f1' }" />
```

### Inline Editor (HTML content)

Inline Editor uses **`v-model:content`** with an **HTML string** only (no presets).

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YanivInlineEditor } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";

const html = ref("<p>Hello</p>");
</script>

<template>
  <YanivInlineEditor v-model:content="html" mode="edit" />
</template>
```

## Full Editor API

Four independent axes plus optional overrides:

```vue
<YanivEditor mode="edit" preset="basic" appearance="word" color-mode="auto" />
```

| Prop                   | Type                                          | Default                        | Notes                                      |
| ---------------------- | --------------------------------------------- | ------------------------------ | ------------------------------------------ |
| `mode`                 | `"edit" \| "preview"`                         | `"edit"`                       | Edit vs read-only display                  |
| `preset`               | `"basic" \| "full" \| "notion"`               | `"basic"`                      | Default feature + layout bundle            |
| `appearance`           | `"default" \| "word" \| "notion" \| "custom"` | `"default"`                    | Visual skin                                |
| `colorMode`            | `"light" \| "dark" \| "auto"`                 | `"light"`                      | Color mode                                 |
| `features`             | `FeatureConfig`                               | preset defaults                | Ability overrides only                     |
| `initialContent`       | `string \| JSONContent`                       | built-in placeholder paragraph | Initial document                           |
| `customAppearanceVars` | `Record<string, string>`                      | —                              | `--ye-*` tokens when `appearance="custom"` |
| `uploadImage`          | `(file: File) => Promise<string>`             | DataURL fallback               | Image upload handler                       |
| `uploadVideo`          | `(file: File) => Promise<string>`             | DataURL fallback               | Video upload handler                       |
| `galleryImages`        | `GalleryImage[]`                              | images from current doc        | External gallery source                    |
| `customTemplates`      | `TemplateItem[]`                              | built-in templates             | Extra document templates                   |
| `locale`               | `string`                                      | `"zh-CN"`                      | Locale code (`zh-CN` \| `en-US`)           |
| `aiConfig`             | `YanivEditorAiConfig`                         | —                              | Host-managed AI config                     |

`features` is merged after `preset` via `mergeFeatures`. Only explicitly set keys override the preset; `undefined` does not replace a preset default:

```ts
import { resolveEditorProfile } from "@yanivjs/yaniv-editor";

const { gates } = resolveEditorProfile({ preset: "basic", features: { table: true } });
```

Example:

```vue
<YanivEditor preset="full" :features="{ table: false }" />
```

Disabling a capability removes its extension registration and toolbar entry points. Toggling features at runtime triggers a session rebuild; content nodes unsupported by the new schema may be dropped.

### Presets

Preset default abilities come from `resolveEditorProfile`. Toolbar buttons are further filtered by active gates.

`basic` is the default. It enables **image** only. Core editing (StarterKit, links, lists, etc.) stays available. It does not enable video, table, AI, Office paste, math, outline, find/replace, format painter, slash command, or drag handle by default.

To keep pre–v0.1.0 basic behavior (table + video):

```vue
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

`full` enables table, video, math, Office paste, outline, find/replace, and format painter. Slash command and drag handle stay off unless you opt in with `:features`. AI is not enabled by default:

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

`notion` focuses on block editing (slash command, drag handle) plus video, math, outline, find/replace, Office paste, and AI. Format painter stays off. It uses floating/block interactions and does not show the fixed top toolbar or footer.

## Preview mode

`mode="preview"` is a content display state (not a separate architecture branch):

- content is not editable (`editable=false`);
- toolbar, footer, floating menu, block menu, and contextual editing tools are hidden;
- links remain clickable;
- video remains playable;
- content remains scrollable and selectable.

Switch phase with the `:mode` prop — do not call `editor.setEditable()` from host code.

Custom CSS: the root node exposes `data-phase="edit|preview"` (the old `.is-preview` class was removed in v0.1.0):

```css
.yaniv-editor[data-phase="preview"] .my-overlay {
  display: none;
}
```

## Inline Editor API

| Prop              | Type                          | Default                        | Notes                       |
| ----------------- | ----------------------------- | ------------------------------ | --------------------------- |
| `content`         | `string`                      | `"<p></p>"`                    | HTML; use `v-model:content` |
| `mode`            | `"edit" \| "preview"`         | `"edit"`                       | Edit vs read-only           |
| `colorMode`       | `"light" \| "dark" \| "auto"` | `"light"`                      | Color mode                  |
| `toolbar`         | `InlineToolbarConfig`         | undo/redo + text format + link | Toolbar switches            |
| `placeholder`     | `string`                      | —                              | Empty paragraph hint        |
| `extraExtensions` | `AnyExtension[]`              | `[]`                           | Extra Tiptap extensions     |
| `editorProps`     | `Record<string, unknown>`     | —                              | Tiptap `editorProps`        |
| `locale`          | `string`                      | `"zh-CN"`                      | Locale code                 |

Default toolbar:

```ts
{ undoRedo: true, textFormat: true, link: true }
```

Advanced:

```vue
<YanivInlineEditor
  v-model:content="html"
  :toolbar="{ undoRedo: true, textFormat: true, link: true, list: true }"
/>
```

Inline toolbar switches drive extension registration via `resolveInlineGates` — disabled groups are not registered. Unsupported marks/nodes in incoming HTML are silently dropped (text preserved).

In `mode="preview"`, the built-in toolbar and custom `#toolbar` slot are not rendered.

## Component expose

Both editors expose the same instance methods via `ref`:

```ts
interface YanivEditorExpose {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | null;
  getHTML: () => string;
  getText: () => string;
}
```

Phase control, session lifecycle, and appearance registration are **not** on expose — use `:mode`, props, and `:custom-appearance-vars`.

## Advanced exports

For custom shells and integrations, the main entry also exports:

- `resolveEditorProfile`, `mergeFeatures`, `resolveChromePolicy`, `computeSessionKey`, `resolveInlineGates`
- `buildExtensions`, `CAPABILITIES`, `applyGatesToToolbarConfig`, `resolveShowInlineToolbar`
- `ContentAdapter`, `applyPhaseTransition`, `BYPASS_GUARD_META`
- Types: `EditorRuntimeProfile`, `ResolvedChromePolicy`, `SessionStatus`, `PhaseChangeEvent`, …

The inline entry additionally exports toolbar building blocks (`InlineToolbar`, `UndoRedoButton`, …), `buildExtensions`, and `CAPABILITIES`.

AI symbols live under `@yanivjs/yaniv-editor/ai` only (not re-exported from the main entry).

## Development

```bash
pnpm install
pnpm dev          # demo → http://localhost:9527 (live: https://yanivwang.github.io/yaniv-editor/examples/)
pnpm docs:dev     # VitePress docs (live: https://yanivwang.github.io/yaniv-editor/)
pnpm run verify   # typecheck + test + lint
```
