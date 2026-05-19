# Inline 按需拼装

当 Full Editor 过重时，可以不使用 `YanivEditor`，而是**直接用 Tiptap `Editor` + 零散工具栏组件**组装轻量编辑器。examples 中的 `/inline-plugins` 演示了这一模式。

## 适用场景

- 评论框、聊天输入
- 表单内嵌富文本字段
- 弹窗 / 卡片内的局部编辑
- 需要运行时动态开关工具栏功能

## 核心思路

```text
new Editor({ extensions: [...] })
  + EditorContent
  + 按需渲染 Toolbar 组件（UndoRedoGroup、HeadingDropdown、TextFormatGroup ...）
```

工具栏组件从 `@/components/editor` 路径导入（对外集成可参考 examples 或按需 re-export）。

## 示例结构

```vue
<script setup lang="ts">
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Editor, EditorContent } from "@tiptap/vue-3";
import { onMounted, onBeforeUnmount, ref } from "vue";

import { UndoRedoGroup, HeadingDropdown, TextFormatButtons, LinkButton } from "@/components/editor";

const editor = ref<Editor | null>(null);

onMounted(() => {
  editor.value = new Editor({
    content: "<p>Start typing...</p>",
    extensions: [StarterKit.configure({ underline: false }), Underline],
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
      <UndoRedoGroup :editor="editor" />
      <HeadingDropdown :editor="editor" />
      <TextFormatButtons :editor="editor" />
      <LinkButton :editor="editor" />
    </div>
    <EditorContent v-if="editor" :editor="editor" />
  </div>
</template>
```

完整可参考仓库 `examples/components/InlinePluginDemo.vue`。

## 可复用的工具栏组件

| 组件                | 功能                                |
| ------------------- | ----------------------------------- |
| `UndoRedoGroup`     | 撤销 / 重做                         |
| `HeadingDropdown`   | H1–H6 标题                          |
| `TextFormatButtons` | 粗体、斜体、下划线、删除线          |
| `FontSizeDropdown`  | 字号                                |
| `ListTools`         | 有序 / 无序 / 任务列表              |
| `AlignDropdown`     | 对齐                                |
| `LinkButton`        | 插入链接                            |
| `CodeBlockButton`   | 代码块                              |
| `FormatClearButton` | 清除格式                            |
| `ImageUpload`       | 图片上传（支持 `uploadImage` 回调） |

## 动态插件面板

Inline Demo 的实现要点：

1. 用 reactive 数组维护插件定义（id、enabled、对应组件）
2. `v-for` 渲染已启用插件的工具栏按钮
3. 扩展层保持**稳定注册**（StarterKit + 常用扩展一次注册），仅 UI 层热插拔

::: tip
仅隐藏工具栏按钮不会移除底层扩展能力；若需真正裁剪能力，应同步调整 `extensions` 数组。
:::

## 预设组合

Demo 内置四套预设，可作为产品配置参考：

| 预设     | 包含插件           |
| -------- | ------------------ |
| Minimal  | 撤销、文本格式     |
| Writer   | + 标题、列表       |
| Standard | + 字号、对齐、链接 |
| Full     | + 代码块、清除格式 |

## Full vs Inline 对比

|                  | Full Editor        | Inline 拼装            |
| ---------------- | ------------------ | ---------------------- |
| 组件             | `YanivEditor`      | 自建 `Editor` + 工具栏 |
| 体积             | 较大               | 可按需裁剪             |
| 分页/缩放        | ✅                 | ❌                     |
| AI / Word / 模板 | ✅                 | 需自行组合             |
| 动态工具栏       | 通过 features 配置 | 运行时 UI 热插拔更灵活 |

## 下一步

- [媒体与图片上传](/features/media)
- [YanivEditor API](/api/yaniv-editor)
