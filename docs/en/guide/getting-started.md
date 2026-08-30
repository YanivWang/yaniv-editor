# Getting Started

## Install

Peer dependencies are required (`vue`, `@tiptap/*`, `ant-design-vue`, etc.—see `package.json` → `peerDependencies`).

```bash
pnpm add @yanivjs/yaniv-editor vue @tiptap/core @tiptap/vue-3 @tiptap/starter-kit @tiptap/pm ant-design-vue
```

After installing peers, you can use the editor **without** `app.use(Antd)` or any extra global Ant Design Vue registration in the host app (components import antd locally via `src/shared/antd.ts`).

## Full Editor

```vue
<script setup lang="ts">
import { YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
</script>

<template>
  <YanivEditor mode="edit" preset="basic" appearance="default" color-mode="light" />
</template>
```

Use `preset="full"` when the page needs table, video, math, Office paste, outline, find/replace, and format painter (not slash command or drag handle — use `preset="notion"` for those).

Use `preset="notion"` when the page needs a block editing workflow.

For `basic` and `full`, enable AI explicitly:

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

For `notion`, AI is enabled by default; pass `:ai-config` for a working provider:

```vue
<YanivEditor preset="notion" :ai-config="aiConfig" />
```

## Inline Editor

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YanivInlineEditor } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";

const html = ref("<p>Hello Yaniv</p>");
</script>

<template>
  <YanivInlineEditor v-model:content="html" mode="edit" />
</template>
```

::: warning Pair the stylesheet with the component entry
`style.css` is for `YanivEditor` (Full); `inline.css` is for `YanivInlineEditor` (Inline).

Since v0.1.4, `inline.css` **no longer bundles the full editor stylesheet**. It previously
concatenated all of `style.css`, so the inline artifact (139KB) was larger than the full one
(114KB) — at odds with the inline entry's lightweight comment/form use case. It is now 56KB.

If a page renders both shapes, import both files. If you imported only `inline.css` but render
the Full Editor, switch to `style.css`.
:::

## AI Subpackage

```ts
import { ContinueWritingExtension, AiMenuButton } from "@yanivjs/yaniv-editor/ai";
```
