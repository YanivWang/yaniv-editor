# Full Editor

Full Editor 指通过 **`YanivEditor`** 一站式接入的完整富文本编辑体验，对应 examples 中的 `/full-editor` 演示页。

## 架构概览

```text
YanivEditor
├── ToolbarNav          # 顶部工具栏
├── LinkBubbleMenu      # 链接气泡菜单
├── TableToolbar        # 表格上下文工具栏
├── ImageToolbar        # 图片工具栏
├── VideoToolbar        # 视频工具栏
├── FloatingMenu        # 选区浮动菜单
├── BlockPickerMenu     # Notion 块菜单（/ 转换、+ 插入；features.slashCommand 或 dragHandle）
├── EditorContent       # 文档编辑区（Word 分页布局）
└── FooterNav           # 底部缩放 / 字数统计
```

扩展注册由 `buildEditorExtensions()` 完成，UI 显示由 `useEditorFeatures()` 与 `features` 门控对齐。

## 基础用法

```vue
<script setup lang="ts">
import { YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
</script>

<template>
  <YanivEditor
    version="advanced"
    locale="zh-CN"
    theme-preset="word"
    theme-mode="light"
    :initial-content="sampleHtml"
    :features="{
      headerNav: true,
      footerNav: true,
      floatingMenu: true,
      slashCommand: true,
      linkBubbleMenu: true,
      tableToolbar: true,
      image: true,
      dragHandle: true,
    }"
    @update="onUpdate"
  />
</template>
```

::: tip 主题说明
通过 `theme-preset` / `theme-mode` 控制视觉，预设 CSS 由组件按需加载。详见 [主题与样式](/guide/theming)。
:::

## 版本与工具栏

| version    | 工具栏配置                | 默认扩展门控                   |
| ---------- | ------------------------- | ------------------------------ |
| `basic`    | `BASIC_TOOLBAR_CONFIG`    | 无格式刷、大纲、查找替换       |
| `advanced` | `ADVANCED_TOOLBAR_CONFIG` | 格式刷、大纲、查找替换默认开启 |

`advanced` 工具栏包含：撤销/重做、格式刷、查找替换、字体、文本格式、颜色、标题、列表、对齐、链接、表格、图片、视频、上下标、Word、模板、图库、AI。

## 常用 features 开关

| 字段             | 作用                                                    | 默认值                |
| ---------------- | ------------------------------------------------------- | --------------------- |
| `headerNav`      | 显示顶部工具栏                                          | `false`（需显式开启） |
| `footerNav`      | 显示底部缩放/字数栏                                     | `false`               |
| `floatingMenu`   | 选区浮动格式化菜单                                      | `false`               |
| `slashCommand`   | `/` 唤起 `BlockPickerMenu`（块类型选择）                | `false`               |
| `linkBubbleMenu` | 链接编辑气泡                                            | `false`               |
| `tableToolbar`   | 表格上下文工具栏                                        | `false`               |
| `image`          | 注册图片/视频扩展                                       | `true`                |
| `table`          | 注册表格扩展                                            | `true`                |
| `ai`             | 注册 AI 扩展                                            | `true`                |
| `dragHandle`     | 块左侧 `+` / 六点柄与拖拽（`+` 共用 `BlockPickerMenu`） | `true`                |
| `searchReplace`  | 查找替换扩展                                            | advanced 默认 `true`  |
| `officePaste`    | Office/WPS 粘贴增强                                     | `true`                |

完整列表见 [功能配置](/api/features-config)。

## 只读与预览模式

```vue
<!-- 只读：可渲染不可编辑 -->
<YanivEditor readonly :initial-content="html" />

<!-- 预览：隐藏工具栏，不可交互 -->
<YanivEditor preview-mode :initial-content="html" />
```

## 暴露的方法

通过 `ref` 访问：

```ts
const editorRef = ref<InstanceType<typeof YanivEditor> | null>(null);

editorRef.value?.getEditor(); // 原始 Tiptap Editor 实例
editorRef.value?.getJSON(); // ProseMirror JSON
editorRef.value?.getHTML(); // HTML 字符串
editorRef.value?.getText(); // 纯文本
```

## 与 Demo 的差异

examples 中的 Full Editor 演示页额外包含：

- 设备预览框（PC / 平板 / 手机）
- 多主题切换 UI
- 自动演示脚本

这些属于 Demo 壳层，**不是** `YanivEditor` 内置能力。生产集成只需引入组件与样式即可。

## 下一步

- [Inline 按需拼装](/guide/inline-composition) — 轻量场景
- [功能总览](/features/overview) — 完整能力清单
- [AI 配置](/features/ai) — 启用 AI 按钮
