# Tiptap UI Kit

Vue 3 + Tiptap 3 富文本编辑器 UI 套件（含主题、工具栏、AI、协作等）。

## 安装

```bash
pnpm add tiptap-ui-kit
# 或: npm install benngaihk/Tiptap-UI-Kit
```

Peer：`@tiptap/core`、`@tiptap/pm`、`@tiptap/starter-kit`、`@tiptap/vue-3`、`vue` 等（见 `package.json`）。

## 使用

```vue
<script setup>
import { ref } from "vue";
import { TiptapProEditor } from "tiptap-ui-kit";
import "tiptap-ui-kit/style.css";

const content = ref("<p>Hello</p>");
</script>

<template>
  <TiptapProEditor v-model="content" theme="notion" locale="zh-CN" />
</template>
```

## 本地开发

```bash
pnpm install
pnpm dev          # 开发库 / demo
pnpm build        # 构建 npm 包
pnpm build:demo   # 构建演示站点
pnpm typecheck
```

## 许可证

MIT — 见 [LICENSE](LICENSE)。
