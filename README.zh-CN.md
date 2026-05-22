# Yaniv Editor

[English](./README.md) | 简体中文

基于 Vue 3 + Tiptap 3 的富文本编辑器组件库（**v0.1.0**）。

| 形态                | 引入路径                       | 适用场景                       |
| ------------------- | ------------------------------ | ------------------------------ |
| `YanivEditor`       | `@yanivjs/yaniv-editor`        | 文档、CMS、知识库              |
| `YanivInlineEditor` | `@yanivjs/yaniv-editor/inline` | 评论、表单、行内输入           |
| AI（可选）          | `@yanivjs/yaniv-editor/ai`     | AI 扩展与界面（续写、AI 菜单） |

完整 API 参考与使用指南见 [`docs/`](./docs/index.md)（运行 `pnpm docs:dev` 启动本地文档站）。破坏性变更与迁移说明：[`CHANGELOG.md`](./CHANGELOG.md)。架构设计：[`ARCHITECTURE.md`](./ARCHITECTURE.md)。

## 安装

需要安装 peer 依赖（`vue` ^3.4、`@tiptap/*` ^3.0、`ant-design-vue` ^4.0 等，完整列表见 `package.json` → `peerDependencies`）。

```bash
pnpm add @yanivjs/yaniv-editor vue @tiptap/core @tiptap/vue-3 @tiptap/starter-kit @tiptap/pm ant-design-vue
# 根据所需的 preset / 功能，按 package.json 继续安装其余 @tiptap/* peer 依赖。
```

### 入口

```ts
// 完整编辑器
import { YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";

// 行内编辑器
import { YanivInlineEditor } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";

// AI（可选）
import { ContinueWritingExtension, AiMenuButton, useAiConfig } from "@yanivjs/yaniv-editor/ai";
```

## 快速上手

### 完整编辑器（JSON 内容）

完整编辑器通过 `@update` 输出 **ProseMirror JSON**；`initialContent` 支持传入 HTML 或 JSON。

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

自定义外观（基于实例作用域的 CSS 变量）：

```vue
<YanivEditor appearance="custom" :custom-appearance-vars="{ '--ye-primary': '#6366f1' }" />
```

### 行内编辑器（HTML 内容）

行内编辑器使用 **`v-model:content`**，仅支持 **HTML 字符串**（不使用 preset 概念）。

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

## 完整编辑器 API

四个互相独立的维度，外加可选覆盖：

```vue
<YanivEditor mode="edit" preset="basic" appearance="word" color-mode="auto" />
```

| 属性                   | 类型                                          | 默认值           | 说明                                         |
| ---------------------- | --------------------------------------------- | ---------------- | -------------------------------------------- |
| `mode`                 | `"edit" \| "preview"`                         | `"edit"`         | 编辑态 / 只读展示态                          |
| `preset`               | `"basic" \| "full" \| "notion"`               | `"basic"`        | 默认能力 + 布局组合                          |
| `appearance`           | `"default" \| "word" \| "notion" \| "custom"` | `"default"`      | 视觉皮肤                                     |
| `colorMode`            | `"light" \| "dark" \| "auto"`                 | `"light"`        | 配色模式                                     |
| `features`             | `FeatureConfig`                               | 跟随 preset      | 仅用于按需覆盖能力开关                       |
| `initialContent`       | `string \| JSONContent`                       | 内置占位段落     | 初始文档                                     |
| `customAppearanceVars` | `Record<string, string>`                      | —                | `appearance="custom"` 时的 `--ye-*` 设计令牌 |
| `uploadImage`          | `(file: File) => Promise<string>`             | 回落到 DataURL   | 图片上传处理函数                             |
| `uploadVideo`          | `(file: File) => Promise<string>`             | 回落到 DataURL   | 视频上传处理函数                             |
| `galleryImages`        | `GalleryImage[]`                              | 当前文档中的图片 | 外部图库来源                                 |
| `customTemplates`      | `TemplateItem[]`                              | 内置模板         | 额外的文档模板                               |
| `locale`               | `string`                                      | `"zh-CN"`        | 语言代码（`zh-CN` \| `en-US`）               |
| `aiConfig`             | `YanivEditorAiConfig`                         | —                | 宿主侧管理的 AI 配置                         |

`features` 会在 `preset` 之后通过 `mergeFeatures` 合并：只有显式设置的键会覆盖 preset，`undefined` 不会重置默认值。

```ts
import { resolveEditorProfile } from "@yanivjs/yaniv-editor";

const { gates } = resolveEditorProfile({ preset: "basic", features: { table: true } });
```

示例：

```vue
<YanivEditor preset="full" :features="{ table: false }" />
```

关闭某项能力时，对应的 Tiptap 扩展不会注册，工具栏入口也会自动隐藏。运行时切换 features 会触发一次 session 重建；新 schema 不支持的节点会被丢弃。

### Preset 说明

各 preset 的默认能力来自 `resolveEditorProfile`；工具栏按钮还会被运行时的 gates 进一步过滤。

`basic` 是默认 preset，仅启用 **图片**（核心能力如 StarterKit、链接、列表等始终可用）。默认不启用视频、表格、AI、Office 粘贴、数学公式、大纲、查找替换、格式刷、斜杠菜单和拖拽手柄。

如需还原 v0.1.0 之前 `basic` 的行为（包含表格与视频）：

```vue
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

`full` 启用表格、视频、数学公式、Office 粘贴、大纲、查找替换、格式刷。斜杠菜单和拖拽手柄需手动通过 `:features` 打开。AI 默认未开启：

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

`notion` 主打块级编辑（斜杠菜单 + 拖拽手柄），并启用视频、数学公式、大纲、查找替换、Office 粘贴和 AI；格式刷默认关闭。其交互以浮动菜单 / 块菜单为主，**不展示**固定顶部工具栏与底部栏。

## 预览模式

`mode="preview"` 是内容的展示状态，不是另一套架构分支：

- 内容不可编辑（`editable=false`）；
- 工具栏、底部栏、浮动菜单、块菜单、上下文编辑工具全部隐藏；
- 链接仍可点击；
- 视频仍可播放；
- 内容仍可滚动与选中。

切换状态时请使用 `:mode` 属性，**不要**在宿主代码里调用 `editor.setEditable()`。

自定义 CSS：根节点上有 `data-phase="edit|preview"`（旧的 `.is-preview` 类已在 v0.1.0 移除）。

```css
.yaniv-editor[data-phase="preview"] .my-overlay {
  display: none;
}
```

## 行内编辑器 API

| 属性              | 类型                          | 默认值                     | 说明                                |
| ----------------- | ----------------------------- | -------------------------- | ----------------------------------- |
| `content`         | `string`                      | `"<p></p>"`                | HTML 字符串；配合 `v-model:content` |
| `mode`            | `"edit" \| "preview"`         | `"edit"`                   | 编辑态 / 只读态                     |
| `colorMode`       | `"light" \| "dark" \| "auto"` | `"light"`                  | 配色模式                            |
| `toolbar`         | `InlineToolbarConfig`         | 撤销重做 + 文本格式 + 链接 | 工具栏开关                          |
| `placeholder`     | `string`                      | —                          | 空段落占位文案                      |
| `extraExtensions` | `AnyExtension[]`              | `[]`                       | 额外的 Tiptap 扩展                  |
| `editorProps`     | `Record<string, unknown>`     | —                          | 透传给 Tiptap 的 `editorProps`      |
| `locale`          | `string`                      | `"zh-CN"`                  | 语言代码                            |

默认 toolbar：

```ts
{ undoRedo: true, textFormat: true, link: true }
```

进阶用法：

```vue
<YanivInlineEditor
  v-model:content="html"
  :toolbar="{ undoRedo: true, textFormat: true, link: true, list: true }"
/>
```

行内工具栏开关通过 `resolveInlineGates` 驱动扩展注册——关闭的分组不会被注册。粘贴进来的 HTML 中遇到不支持的 mark / node 会被静默丢弃（文字保留）。

`mode="preview"` 下，内置工具栏和自定义 `#toolbar` 插槽都不会渲染。

## 组件实例方法

两种编辑器通过 `ref` 暴露相同的实例方法：

```ts
interface YanivEditorExpose {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | null;
  getHTML: () => string;
  getText: () => string;
}
```

状态切换、session 生命周期和外观注册**不**通过 expose 暴露——请使用 `:mode`、props 和 `:custom-appearance-vars`。

## 进阶导出

如需自定义壳或深度集成，主入口还导出：

- `resolveEditorProfile`、`mergeFeatures`、`resolveChromePolicy`、`computeSessionKey`、`resolveInlineGates`
- `buildExtensions`、`CAPABILITIES`、`applyGatesToToolbarConfig`、`resolveShowInlineToolbar`
- `ContentAdapter`、`applyPhaseTransition`、`BYPASS_GUARD_META`
- 类型：`EditorRuntimeProfile`、`ResolvedChromePolicy`、`SessionStatus`、`PhaseChangeEvent` 等

行内入口还导出工具栏的基础组件（`InlineToolbar`、`UndoRedoButton` 等）、`buildExtensions`、`CAPABILITIES`。

AI 相关导出仅在 `@yanivjs/yaniv-editor/ai` 下提供，不会从主入口重新导出。

## 本地开发

```bash
pnpm install
pnpm dev          # demo → http://localhost:9527
pnpm docs:dev     # VitePress 文档
pnpm run verify   # 类型检查 + 测试 + Lint
```
