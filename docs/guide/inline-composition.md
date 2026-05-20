# Inline 按需拼装

当 Full Editor 过重时，可以不使用 `YanivEditor`，而是直接用 Tiptap `Editor` + Inline 工具栏组件组装轻量编辑器。examples 中的 `/inline-plugins` 演示了这一模式。

## 适用场景

- 评论框、聊天输入
- 表单内嵌富文本字段
- 弹窗 / 卡片内的局部编辑
- 需要运行时动态开关工具栏功能

## 核心思路

```text
new Editor({ extensions: [...] })
  + EditorContent
  + 按需渲染 Inline 工具栏组件（UndoRedoButton、HeadingControl、TextFormatButtons ...）
```

Inline 模式下，业务方负责创建和销毁 Tiptap `Editor`，并决定注册哪些 Tiptap extensions。Yaniv Editor 只提供可复用的工具栏组件与 `inline.css` 样式入口。

## 样式接入

Inline 使用独立入口：

```ts
import { UndoRedoButton, HeadingControl, TextFormatButtons } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";
```

`inline.css` 由 `src/styles/inline.css` 聚合构建，包含 Inline 工具栏样式、正文区基础排版（标题/段落/列表/行内 code）以及编辑区 focus 重置。业务方只需在外层包一层 `.yaniv-editor` 容器（与 Demo 一致），并在 `editorProps.attributes.class` 中设置 `inline-prose`。不要单独 import `src/styles/toolbar.css`、`src/styles/toolbar-dropdown.css` 等内部文件。

Full Editor 仍使用：

```ts
import { YanivEditor, editorPresets } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
```

## 示例结构

```vue
<script setup lang="ts">
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Editor, EditorContent } from "@tiptap/vue-3";
import { onMounted, onBeforeUnmount, ref } from "vue";

import {
  UndoRedoButton,
  HeadingControl,
  TextFormatButtons,
  ListTools,
} from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";

const editor = ref<Editor | null>(null);

onMounted(() => {
  editor.value = new Editor({
    content: "<p>Start typing...</p>",
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    editorProps: {
      attributes: { class: "inline-prose" },
    },
  });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <div class="inline-editor-card">
    <div v-if="editor" class="inline-toolbar">
      <UndoRedoButton :editor="editor" />
      <HeadingControl variant="dropdown" :editor="editor" />
      <TextFormatButtons :editor="editor" />
      <ListTools :editor="editor" />
    </div>
    <EditorContent v-if="editor" :editor="editor" />
  </div>
</template>
```

完整可参考仓库 `examples/pages/InlinePluginsExample.vue`。

## 组件与扩展对应关系

Inline 组件只负责 UI 与命令触发，不会替业务方自动注册 Tiptap extension。按钮能否生效，取决于 `new Editor({ extensions })` 中是否注册了对应能力。

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
| `CodeBlockDropdown` | `StarterKit` 中的 codeBlock，或自定义 codeBlock / lowlight                    |

## 第一版导出范围

`@yanivjs/yaniv-editor/inline` 第一版只导出轻量工具栏组件：

| 组件                | 功能                                 |
| ------------------- | ------------------------------------ |
| `UndoRedoButton`    | 撤销 / 重做                          |
| `HeadingControl`    | 正文 + H1-H6（`variant="dropdown"`） |
| `TextFormatButtons` | 粗体、斜体、下划线、删除线           |
| `ListTools`         | 有序 / 无序 / 任务列表               |
| `AlignDropdown`     | 对齐                                 |
| `LinkButton`        | 插入链接                             |
| `ClearFormatButton` | 清除格式                             |
| `FontSizeSelect`    | 字号                                 |
| `FontFamilySelect`  | 字体                                 |
| `CodeBlockDropdown` | 代码块                               |

`YanivEditor`、`editorPresets`、AI、Word、模板、图库、缩放、大纲等完整编辑器或重功能不从 `/inline` 导出。

## Full vs Inline 对比

|                  | Full Editor                       | Inline 拼装                        |
| ---------------- | --------------------------------- | ---------------------------------- |
| 入口             | `@yanivjs/yaniv-editor`           | `@yanivjs/yaniv-editor/inline`     |
| 样式             | `@yanivjs/yaniv-editor/style.css` | `@yanivjs/yaniv-editor/inline.css` |
| 组件             | `YanivEditor`                     | 自建 `Editor` + 工具栏组件         |
| 扩展注册         | 由 `YanivEditor` 根据 props 处理  | 业务方自己注册                     |
| 分页/缩放        | 内置                              | 不内置                             |
| AI / Word / 模板 | 内置完整入口                      | 不从第一版 Inline 入口导出         |

## 下一步

- [Full Editor 集成指南](/guide/full-editor)
- [YanivEditor API](/api/yaniv-editor)
