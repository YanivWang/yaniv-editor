# Getting Started

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

Use `preset="full"` when the page needs advanced document abilities such as table, video, math, Office paste, outline, find/replace, format painter, slash command, and drag handle.

Use `preset="notion"` when the page needs a block editing workflow.

Enable AI explicitly when needed:

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
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

## AI Subpackage

```ts
import { ContinueWritingExtension, AiMenuButton } from "@yanivjs/yaniv-editor/ai";
```
