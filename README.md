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

## Full Editor API

Full Editor is defined by four independent axes:

```vue
<YanivEditor mode="edit" preset="basic" appearance="word" color-mode="auto" />
```

- `mode`: `edit | preview`.
- `preset`: `basic | full | notion`.
- `appearance`: `default | word | notion | github | typora | custom`.
- `colorMode`: `light | dark | auto`.
- `features`: ability overrides only.

`features` is merged after `preset`:

```ts
resolvedFeatures = {
  ...presetFeatures[preset],
  ...props.features,
};
```

Example:

```vue
<YanivEditor preset="full" :features="{ ai: false }" />
```

This keeps the full preset but removes AI extension registration and AI UI entry points.

## Presets

`basic` is the default recommendation. It enables common authoring abilities such as text formatting, links, image, video, and table. It does not enable AI, Office paste, math, outline, find/replace, format painter, slash command, or drag handle by default.

`full` enables advanced abilities such as AI, Office paste, math, outline, find/replace, and format painter.

`notion` focuses on block editing. It uses floating/block interactions, slash command, and drag handle, and does not show the fixed top toolbar or footer.

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
