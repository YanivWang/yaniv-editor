# 快速开始

## 安装

需要 peer 依赖（`vue`、`@tiptap/*`、`ant-design-vue` 等，完整列表见 `package.json` → `peerDependencies`）。

```bash
pnpm add @yanivjs/yaniv-editor vue @tiptap/core @tiptap/vue-3 @tiptap/starter-kit @tiptap/pm ant-design-vue
```

安装 peer 依赖后即可使用，**无需**在宿主应用中执行 `app.use(Antd)` 或额外全局注册 Ant Design Vue 组件（库内部通过 `src/shared/antd.ts` 按需局部注册）。

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

页面需要表格、视频、公式、Office 粘贴、大纲、查找替换、格式刷时，使用 `preset="full"`（不含斜杠命令和拖拽手柄，块编辑请用 `preset="notion"`）。

需要块编辑工作流时使用 `preset="notion"`。

`basic` 和 `full` 需显式开启 AI：

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

`notion` 默认开启 AI，传入 `:ai-config` 即可调用 provider：

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

## AI 子包

```ts
import { ContinueWritingExtension, AiMenuButton } from "@yanivjs/yaniv-editor/ai";
```
