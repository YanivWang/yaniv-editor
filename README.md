# yaniv-editor

Vue 3 + Tiptap 3 富文本编辑器 UI 套件（主题、可插拔工具栏、AI 辅助等）。

📖 **[完整文档](docs/index.md)** · 本地阅读：`pnpm docs:dev`

## 特性

- **完整编辑能力** — 标题、列表、表格、图片、视频、链接、代码块、数学公式
- **两种集成方式** — `TiptapProEditor` 一站式接入，或按需拼装工具栏组件（Inline 模式）
- **多主题** — Word / Notion / GitHub / Typora 视觉预设，支持明暗色
- **AI 辅助** — 续写、润色、摘要、翻译（需配置 API）
- **Word 互转** — .docx 导入导出
- **i18n** — 简体中文、繁体中文、English

> 多人实时协作、@提及、版本历史等能力**尚未内置**，需业务层自行扩展。详见 [FAQ](docs/faq.md)。

## 安装

```bash
pnpm add yaniv-editor
```

Peer：`@tiptap/core`、`@tiptap/pm`、`@tiptap/starter-kit`、`@tiptap/vue-3`、`vue` 等（见 `package.json`）。

推荐同时安装（完整 UI）：`ant-design-vue`、`@ant-design/icons-vue`。

## 使用

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TiptapProEditor } from "yaniv-editor";
import "yaniv-editor/style.css";

const editorRef = ref<InstanceType<typeof TiptapProEditor> | null>(null);

function handleUpdate(content: unknown) {
  // 持久化到后端
  console.log(content);
}
</script>

<template>
  <TiptapProEditor
    ref="editorRef"
    version="advanced"
    locale="zh-CN"
    :initial-content="'<p>Hello</p>'"
    :features="{
      headerNav: true,
      footerNav: true,
    }"
    @update="handleUpdate"
  />
</template>
```

> **提示：** 组件不支持 `v-model`，通过 `@update` 或 `ref.getJSON()` / `getHTML()` 读取内容。详见 [快速开始](docs/guide/getting-started.md)。

## 文档

| 章节        | 链接                                                                 |
| ----------- | -------------------------------------------------------------------- |
| 快速开始    | [docs/guide/getting-started.md](docs/guide/getting-started.md)       |
| Full Editor | [docs/guide/full-editor.md](docs/guide/full-editor.md)               |
| Inline 拼装 | [docs/guide/inline-composition.md](docs/guide/inline-composition.md) |
| 功能总览    | [docs/features/overview.md](docs/features/overview.md)               |
| API         | [docs/api/tiptap-pro-editor.md](docs/api/tiptap-pro-editor.md)       |
| FAQ         | [docs/faq.md](docs/faq.md)                                           |

本地预览文档站点：

```bash
pnpm docs:dev    # http://localhost:5173
pnpm docs:build  # 构建静态站点
```

## 本地开发

```bash
pnpm install
pnpm dev          # 开发库 / examples 演示
pnpm build        # 构建 npm 包
pnpm build:demo   # 构建 examples 演示站点
pnpm typecheck
```

## AI 配置（可选）

复制 `.env.example` 为 `.env` 并填写 API Key：

```bash
VITE_AI_PROVIDER=openai
VITE_AI_API_KEY=sk-...
```

详见 [AI 辅助文档](docs/features/ai.md)。

## 许可证

MIT — 见 [LICENSE](LICENSE)。
