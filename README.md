# Yaniv Editor

<div align="center">

✨ **Vue 3 + Tiptap 3 富文本编辑器 UI 套件**

开箱即用的编辑器主题与组件库：多视觉预设、可插拔工具栏、功能门控、AI 辅助写作与 Word 互转；支持 **Full Editor** 一站式接入与 **Inline** 按需拼装两种集成方式。

[![npm version](https://img.shields.io/npm/v/@yanivjs/yaniv-editor?logo=npm&logoColor=white)](https://www.npmjs.com/package/@yanivjs/yaniv-editor) [![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/) [![Tiptap 3](https://img.shields.io/badge/Tiptap-3-000000?logo=prosemirror&logoColor=white)](https://tiptap.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/) [![pnpm](https://img.shields.io/badge/pnpm-≥10.17-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/) [![Node.js ≥20](https://img.shields.io/badge/Node.js-≥20.19-green?logo=node.js&logoColor=white)](https://nodejs.org/)

[**完整文档**](docs/index.md) · [**快速开始**](docs/guide/getting-started.md) · [**功能总览**](docs/features/overview.md) · [**GitHub**](https://github.com/YanivWang/yaniv-editor) · [**npm**](https://www.npmjs.com/package/@yanivjs/yaniv-editor)

</div>

---

## 目录

- [核心亮点](#核心亮点)
- [技术栈](#技术栈)
- [适用场景](#适用场景)
- [环境要求](#环境要求)
- [安装与快速上手](#安装与快速上手)
- [集成预设 editorPresets](#集成预设-editorpresets)
- [本地演示](#本地演示)
- [常用命令](#常用命令)
- [核心目录结构](#核心目录结构)
- [文档导航](#文档导航)
- [AI 配置（可选）](#ai-配置可选)
- [代码质量与提交约定](#代码质量与提交约定)

---

## 核心亮点

| 维度             | 说明                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------- |
| **完整编辑能力** | 标题、列表、表格、图片、视频、链接、代码块、数学公式、查找替换、Office/WPS 粘贴增强等 |
| **两种集成方式** | `YanivEditor` 一站式接入，或按需拼装 `@/components/editor` 工具栏组件（Inline 模式）  |
| **功能门控**     | 通过 `features` 与 `editorPresets` 精确控制扩展注册与 UI 显示，避免能力与界面不一致   |
| **多主题**       | Word / Notion / GitHub / Typora 视觉预设，支持明暗色与自定义 CSS 变量                 |
| **AI 辅助**      | 续写、润色、摘要、翻译、自定义指令；可对接 OpenAI、DeepSeek、通义千问、Ollama 等      |
| **Word 互转**    | `.docx` 导入导出（`docx` + `mammoth`）                                                |
| **i18n**         | 简体中文、繁体中文、English                                                           |
| **面向生产**     | 暴露 `getJSON` / `getHTML` / `getText`；内容持久化、图片 OSS 上传由业务层接入         |

> 多人实时协作、@提及、版本历史等能力**尚未内置**，需业务层基于 Tiptap 协作扩展自行实现。详见 [FAQ](docs/faq.md) 与 [功能缺口](docs/features/incomplete-features.md)。

---

## 技术栈

| 类别     | 技术                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 核心     | Vue 3、TypeScript、Tiptap 3、ProseMirror                                |
| 构建     | Vite 6、`vite-plugin-dts`、Vue SFC                                      |
| UI       | Ant Design Vue、Ant Design Icons、Lucide Icons                          |
| 文档     | VitePress                                                               |
| 工程化   | ESLint 9 flat、Prettier、Stylelint、Husky、lint-staged、Commitlint      |
| 依赖能力 | KaTeX（数学）、Lowlight（代码高亮）、docx / mammoth（Word）、hotkeys-js |

---

## 适用场景

| 场景                    | 推荐方案                                                  |
| ----------------------- | --------------------------------------------------------- |
| CMS / 博客 / 知识库正文 | `YanivEditor` + `editorPresets.production`                |
| 内网文档（单人编辑）    | Full Editor + 自建保存 API                                |
| 评论 / 聊天 / 表单内嵌  | Inline 按需拼装 `@/components/editor` 组件                |
| Notion 风格块编辑       | `editorPresets.notion`（浮动菜单 + 斜杠命令，无固定顶栏） |
| Google Docs 式多人协作  | ❌ 当前未内置，需自行扩展                                 |

---

## 环境要求

| 依赖    | 版本 / 说明                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------- |
| Node.js | ≥ `20.19.5`（`.nvmrc` 推荐 **22**）                                                                |
| pnpm    | ≥ `10.17.0`（与 [`package.json`](package.json) 中 `packageManager` 一致；**请勿混用** npm / yarn） |

---

## 安装与快速上手

### 安装

```bash
pnpm add @yanivjs/yaniv-editor
```

**Peer Dependencies**（宿主项目需安装，版本见 `package.json`）：

| 包                                         | 说明                                      |
| ------------------------------------------ | ----------------------------------------- |
| `vue` ^3.4                                 | Vue 3 运行时                              |
| `@tiptap/core` ^3.0                        | Tiptap 核心                               |
| `@tiptap/vue-3` ^3.0                       | Vue 3 绑定                                |
| `@tiptap/starter-kit` ^3.0                 | 基础扩展集                                |
| `@tiptap/pm` ^3.0                          | ProseMirror 依赖                          |
| `@tiptap/extension-table-of-contents` ^3.0 | 大纲 / 目录                               |
| `@tiptap/extension-unique-id` ^3.0         | 块级唯一 ID                               |
| `ant-design-vue` ^4.0                      | 内置 UI 组件                              |
| `@ant-design/icons-vue` ^7.0               | 内置图标                                  |
| `lowlight` ^3.0                            | 代码高亮                                  |
| `katex` ^0.16                              | 数学公式（启用 `math` 时）                |
| `hotkeys-js` ^4.0                          | 查找替换快捷键（启用 `searchReplace` 时） |
| `docx` ^9.0、`file-saver` ^2.0             | Word 导出（启用 Word 导出时）             |
| `mammoth` ^1.0                             | Word 导入（启用 Word 导入时）             |

完整依赖列表以 `package.json` 的 `peerDependencies` 为准。

### 可选能力样式

启用 **数学公式** 时，除 `style.css` 外还需引入 KaTeX 样式（不随 npm 包分发，避免 ~1.4MB 字体冗余）：

```ts
import "katex/dist/katex.min.css";
```

主题预设（Notion / GitHub / Word 等）已包含在 `style.css` 中，切换 `preset` 即可，无需额外 CSS 文件。

### 最小示例

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YanivEditor, editorPresets } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";

const editorRef = ref<InstanceType<typeof YanivEditor> | null>(null);

function handleUpdate(content: unknown) {
  // 持久化到后端
  console.log(content);
}

function save() {
  const html = editorRef.value?.getHTML();
  const json = editorRef.value?.getJSON();
  console.log({ html, json });
}
</script>

<template>
  <YanivEditor
    ref="editorRef"
    v-bind="editorPresets.production"
    locale="zh-CN"
    :initial-content="'<p>Hello Yaniv!</p>'"
    @update="handleUpdate"
  />
  <button type="button" @click="save">保存</button>
</template>
```

> **提示：** 组件**不支持** `v-model`。请通过 `@update` 监听内容变化，或使用 `ref.getJSON()` / `getHTML()` / `getText()` 读取内容。详见 [快速开始](docs/guide/getting-started.md)。

---

## 集成预设 editorPresets

内置与 `YanivEditor` 同构的集成预设，可直接 `v-bind`：

| 预设         | 说明                                                |
| ------------ | --------------------------------------------------- |
| `production` | 生产推荐：完整工具栏 + 常用体验模块                 |
| `basic`      | 基础档位 + 顶栏                                     |
| `minimal`    | 基础档位，无顶栏                                    |
| `notion`     | Notion 风格：浮动菜单、斜杠命令、块拖拽，无固定顶栏 |

```vue
<script setup lang="ts">
import { YanivEditor, editorPresets, mergeEditorPreset } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";

const props = mergeEditorPreset("production", {
  features: { ai: false },
});
</script>

<template>
  <YanivEditor v-bind="props" locale="zh-CN" @update="console.log" />
</template>
```

详见 [功能配置 — editorPresets](docs/api/features-config.md#editorpresets-推荐)。

---

## 本地演示

仓库内置 **examples** 演示站点，可体验 **Full Editor** 与 **Inline + Plugins** 两种模式：

```bash
pnpm install
pnpm dev
```

浏览器访问 Vite 开发服务器（默认 `http://localhost:5173`），从首页进入对应示例页。

构建静态演示站点：

```bash
pnpm build:demo
```

---

## 常用命令

| 功能                      | 命令                                      |
| ------------------------- | ----------------------------------------- |
| 本地开发（库 + examples） | `pnpm dev`                                |
| 构建 npm 包               | `pnpm build`                              |
| 构建演示站点              | `pnpm build:demo`                         |
| 类型检查                  | `pnpm typecheck`                          |
| Lint                      | `pnpm lint` · `pnpm lint:fix`             |
| 样式 Lint                 | `pnpm lint:style` · `pnpm lint:style:fix` |
| 格式化                    | `pnpm format` · `pnpm format:check`       |
| 提交前全套校验            | `pnpm verify`                             |
| 文档本地预览              | `pnpm docs:dev` → `http://localhost:5173` |
| 文档构建                  | `pnpm docs:build` · `pnpm docs:preview`   |
| 发布 npm                  | `pnpm release`                            |

`prepare` 会安装 Husky；未执行过 `pnpm install` 则无 Git 钩子。

---

## 核心目录结构

```
yaniv-editor/
├── package.json              # 包信息、脚本、peer / dev 依赖
├── vite.config.ts            # 库构建
├── vite.config.demo.ts       # 演示站点构建
├── docs/                     # VitePress 文档
├── examples/                 # 本地演示（Full / Inline）
└── src/
    ├── index.ts              # 包入口
    ├── core/                 # YanivEditor 主编排
    ├── components/
    │   ├── base/             # 通用 UI 基元
    │   ├── editor/           # 编辑器功能控件（标题、列表、图片等）
    │   └── tools/            # 外围编排（顶栏、底栏、浮动菜单等）
    ├── configs/              # 功能门控、预设、常量
    ├── extensions/           # Tiptap 扩展与自定义扩展
    ├── features/ai/          # AI 适配器、扩展与配置
    ├── themes/               # 主题预设与切换 API
    ├── locales/              # i18n 文案
    └── styles/               # 全局样式（打包为 style.css）
```

面向贡献者的详细说明见 [项目结构](docs/contributing/project-structure.md)。

---

## 文档导航

| 章节            | 链接                                                                 |
| --------------- | -------------------------------------------------------------------- |
| 文档首页        | [docs/index.md](docs/index.md)                                       |
| 快速开始        | [docs/guide/getting-started.md](docs/guide/getting-started.md)       |
| Full Editor     | [docs/guide/full-editor.md](docs/guide/full-editor.md)               |
| Inline 拼装     | [docs/guide/inline-composition.md](docs/guide/inline-composition.md) |
| 主题与样式      | [docs/guide/theming.md](docs/guide/theming.md)                       |
| 功能总览        | [docs/features/overview.md](docs/features/overview.md)               |
| YanivEditor API | [docs/api/yaniv-editor.md](docs/api/yaniv-editor.md)                 |
| 功能配置        | [docs/api/features-config.md](docs/api/features-config.md)           |
| Composables     | [docs/api/composables.md](docs/api/composables.md)                   |
| FAQ             | [docs/faq.md](docs/faq.md)                                           |

本地预览文档站点：

```bash
pnpm docs:dev    # http://localhost:5173
pnpm docs:build  # 构建静态站点
```

---

## AI 配置（可选）

复制 [`.env.example`](.env.example) 为 `.env` 并填写 API Key：

```bash
# Provider: openai | deepseek | aliyun | ollama | custom
VITE_AI_PROVIDER=openai
VITE_AI_API_KEY=sk-...
# VITE_AI_BASE_URL=
# VITE_AI_MODEL=
```

**集成方推荐**通过组件 props 注入（不暴露设置面板、不写 localStorage）：

```vue
<YanivEditor
  v-bind="editorPresets.production"
  :ai-config="{
    provider: 'openai',
    storageMode: 'proxy',
    endpoint: '/api/ai/v1',
    model: 'gpt-4o-mini',
  }"
/>
```

也可在编辑器内 **AI 设置面板** 配置（存储于浏览器 localStorage，适合 Demo）。详见 [AI 辅助文档](docs/features/ai.md)。

---

## 代码质量与提交约定

- **ESLint**：[`eslint.config.mjs`](eslint.config.mjs)（flat config + typescript-eslint + vue）
- **Prettier**：[`prettier.config.mjs`](prettier.config.mjs)
- **Stylelint**：[`.stylelintrc.json`](.stylelintrc.json)
- **Commitlint**：Conventional Commits（[`commitlint.config.cjs`](commitlint.config.cjs)）
- **lint-staged**：见根 [`package.json`](package.json)，由 Husky 在 pre-commit 调用

示例：

```text
feat(editor): 增加表格单元格背景色
fix(ai): 修正 Ollama 本地端点连接
docs: 更新 README 与功能总览
```

---
