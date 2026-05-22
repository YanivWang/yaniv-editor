# Yaniv Editor

Vue 3 + Tiptap 3 rich-text editor library with two component shapes:

- `YanivEditor`: full document editor.
- `YanivInlineEditor`: lightweight inline editor.

## Install

```bash
pnpm add @yanivjs/yaniv-editor
```

Full editor:

```ts
import { YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
```

Inline editor:

```ts
import { YanivInlineEditor } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";
```

AI extensions and UI (optional):

```ts
import { ContinueWritingExtension, AiMenuButton } from "@yanivjs/yaniv-editor/ai";
```

## Full Editor API

Full Editor is defined by four independent axes:

```vue
<YanivEditor mode="edit" preset="basic" appearance="word" color-mode="auto" />
```

- `mode`: `edit | preview`.
- `preset`: `basic | full | notion`.
- `appearance`: `default | word | notion | custom`.
- `colorMode`: `light | dark | auto`.
- `features`: ability overrides only.

`features` is merged after `preset` via `mergeFeatures`. Only explicitly set keys override the preset; `undefined` does not replace a preset default:

```ts
import { resolveEditorProfile } from "@yanivjs/yaniv-editor";

const { features: resolvedFeatures } = resolveEditorProfile({
  preset,
  features: props.features,
});
```

Example:

```vue
<YanivEditor preset="full" :features="{ table: false }" />
```

This keeps the full preset but removes table extension registration and table UI entry points.

## Presets

Preset default abilities are resolved by `resolveEditorProfile` in runtime. Toolbar buttons are further filtered by active gates.

`basic` is the default recommendation. It enables image only. Text formatting, links, and other core editing remain available. It does not enable video, table, AI, Office paste, math, outline, find/replace, format painter, slash command, or drag handle by default.

To keep the old basic behavior with table and video:

```vue
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

`full` enables advanced document abilities such as table, video, math, Office paste, outline, find/replace, format painter, slash command, and drag handle. AI is not enabled by default:

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

`notion` focuses on block editing (slash command, drag handle) plus video, math, outline, find/replace, Office paste, and AI. Format painter stays off. It uses floating/block interactions and does not show the fixed top toolbar or footer.

## Preview Behavior

`mode="preview"` is a content display state:

- editor content is not editable;
- toolbar, footer, floating menu, block menu, and contextual editing tools are hidden;
- links remain clickable;
- video remains playable;
- content remains scrollable and selectable.

## Inline Editor API

Inline Editor keeps a smaller API and does not provide presets:

```vue
<YanivInlineEditor v-model:content="html" mode="edit" />
<YanivInlineEditor :content="html" mode="preview" />
```

Default toolbar:

```ts
{
  undoRedo: true,
  textFormat: true,
  link: true,
}
```

Advanced users pass `toolbar` directly:

```vue
<YanivInlineEditor
  v-model:content="html"
  :toolbar="{ undoRedo: true, textFormat: true, link: true, list: true }"
/>
```

Inline toolbar switches also drive Inline extension registration, so disabled toolbar groups are not registered as editing capabilities.
