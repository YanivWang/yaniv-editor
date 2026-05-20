# Inline 按需拼装

当 Full Editor 过重时，使用 `@yanivjs/yaniv-editor/inline` 入口。推荐先用 **`YanivInlineEditor` 壳组件**开箱即用；需要完全控制时再自行拼装。

Examples：

- `/inline-editor` — `YanivInlineEditor` + preset（推荐）
- `/inline-compose` — 自管 `Editor` + 按需工具栏组件（DIY）

## 适用场景

- 评论框、聊天输入
- 表单内嵌富文本字段
- 弹窗 / 卡片内的局部编辑
- 需要运行时动态开关工具栏功能

## 推荐：`YanivInlineEditor`

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YanivInlineEditor, inlinePresets, mergeInlinePreset } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";

const html = ref("<p>写一条评论…</p>");

const preset = mergeInlinePreset("comment", {
  toolbar: { list: true },
});
</script>

<template>
  <YanivInlineEditor v-model:content="html" v-bind="preset" placeholder="写一条评论…" />
</template>
```

壳组件负责：

- Editor 创建 / 销毁
- `.yaniv-editor` + `inline-prose` 布局
- 按 `toolbar` 配置渲染默认工具栏，并 **自动注册对应 Tiptap extensions**
- 暴露 `getEditor()` / `getHTML()` 等

预设档位见 [YanivInlineEditor API](/api/yaniv-inline-editor)。高级用户可用 `#toolbar` slot 完全自定义工具栏。

## 自行拼装（DIY）

```text
buildInlineExtensions({ gates }) 或手动 extensions
  + new Editor / useEditor
  + EditorContent
  + 按需渲染 Inline 工具栏组件 / InlineToolbar
```

```vue
<script setup lang="ts">
import { EditorContent, useEditor } from "@tiptap/vue-3";
import {
  buildInlineExtensions,
  resolveInlineExtensionGates,
  UndoRedoButton,
  TextFormatButtons,
} from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";

const toolbar = { undoRedo: true, textFormat: true } as const;

const editor = useEditor({
  extensions: buildInlineExtensions({
    gates: resolveInlineExtensionGates({ toolbar }),
  }),
  editorProps: { attributes: { class: "inline-prose" } },
});
</script>

<template>
  <div class="yaniv-editor">
    <UndoRedoButton v-if="editor" :editor="editor" />
    <TextFormatButtons v-if="editor" :editor="editor" />
    <EditorContent v-if="editor" :editor="editor" />
  </div>
</template>
```

完整可参考 `examples/pages/InlineComposeExample.vue`。

DIY 时推荐配合 `buildInlineExtensions`，避免工具栏与 extensions 不同步。

## 样式接入

```ts
import { YanivInlineEditor } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";
```

`inline.css` 聚合 Inline 工具栏样式、正文排版与壳组件布局。使用 `YanivInlineEditor` 时无需手动设置 `inline-prose`；DIY 时在 `editorProps.attributes.class` 中设置 `inline-prose`，外层包 `.yaniv-editor`。

Full Editor 仍使用：

```ts
import { YanivEditor, editorPresets } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
```

## 组件与扩展对应关系

使用 `YanivInlineEditor` 或 `buildInlineExtensions` 时，以下映射 **自动处理**。DIY 且手动注册 extensions 时需自行对照：

| Inline 组件         | 依赖的 Tiptap 能力 / extension                                                |
| ------------------- | ----------------------------------------------------------------------------- |
| `UndoRedoButton`    | `StarterKit` 中的 history                                                     |
| `HeadingControl`    | `StarterKit` 中的 heading / paragraph                                         |
| `TextFormatButtons` | `StarterKit` 中的 bold、italic、strike；下划线需 `Underline`                  |
| `ListTools`         | `StarterKit` 中的 bulletList、orderedList；任务列表需 `TaskList` / `TaskItem` |
| `AlignDropdown`     | `TextAlign.configure({ types: ["heading", "paragraph"] })`                    |
| `LinkButton`        | `Link`                                                                        |
| `ClearFormatButton` | `StarterKit` 中的基础 marks / nodes                                           |
| `FontSizeSelect`    | Yaniv `FontSize` extension                                                    |
| `FontFamilySelect`  | `@tiptap/extension-font-family`                                               |
| `CodeBlockDropdown` | `codeBlockLowlight`（`rich` preset 较重，依赖 `lowlight` peer）               |

::: tip
`ListTools` 需传 `:show-task-list="true"` 才显示任务列表按钮；`InlineToolbar` 与 `YanivInlineEditor` 已内置。
:::

## 导出范围

| 类型       | 名称                                                       |
| ---------- | ---------------------------------------------------------- |
| 壳组件     | `YanivInlineEditor`                                        |
| 工具栏编排 | `InlineToolbar`                                            |
| 预设       | `inlinePresets`, `mergeInlinePreset`                       |
| 扩展构建   | `buildInlineExtensions`, `resolveInlineExtensionGates`     |
| 工具栏组件 | `UndoRedoButton`, `HeadingControl`, `TextFormatButtons`, … |

AI、Word、模板、图库、缩放、大纲等 Full Editor 重功能不从 `/inline` 导出。

## Full vs Inline 对比

|                  | Full Editor             | Inline（推荐壳）               | Inline DIY                   |
| ---------------- | ----------------------- | ------------------------------ | ---------------------------- |
| 入口             | `@yanivjs/yaniv-editor` | `@yanivjs/yaniv-editor/inline` | 同上                         |
| 样式             | `style.css`             | `inline.css`                   | `inline.css`                 |
| 组件             | `YanivEditor`           | `YanivInlineEditor`            | 自建 `Editor` + 工具栏组件   |
| 扩展注册         | 由 `features` 自动处理  | 由 `toolbar` 自动处理          | 推荐 `buildInlineExtensions` |
| 分页/缩放        | 内置                    | 不内置                         | 不内置                       |
| AI / Word / 模板 | 内置                    | 不导出                         | 不导出                       |

## 下一步

- [YanivInlineEditor API](/api/yaniv-inline-editor)
- [Full Editor 集成指南](/guide/full-editor)
- [YanivEditor API](/api/yaniv-editor)
