# YanivInlineEditor

轻量行内编辑器壳组件：preset + `toolbar` 驱动工具栏与 Tiptap extensions 自动同步。

## 导入

```ts
import {
  YanivInlineEditor,
  inlinePresets,
  mergeInlinePreset,
  buildInlineExtensions,
  resolveInlineExtensionGates,
} from "@yanivjs/yaniv-editor/inline";
import type {
  YanivInlineEditorProps,
  YanivInlineEditorExpose,
  InlineToolbarConfig,
} from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";
```

## 快速开始

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YanivInlineEditor, inlinePresets } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";

const html = ref("<p>Hello</p>");
</script>

<template>
  <YanivInlineEditor v-model:content="html" v-bind="inlinePresets.comment" />
</template>
```

## Props

| Prop              | 类型                      | 默认值         | 说明                                                        |
| ----------------- | ------------------------- | -------------- | ----------------------------------------------------------- |
| `content`         | `string`                  | `'<p></p>'`    | HTML 内容，支持 `v-model:content`                           |
| `toolbar`         | `InlineToolbarConfig`     | `minimal` 预设 | 工具栏开关，见下表                                          |
| `readonly`        | `boolean`                 | `false`        | 只读模式                                                    |
| `locale`          | `string`                  | `'zh-CN'`      | 界面语言                                                    |
| `placeholder`     | `string`                  | —              | 空段落占位文案                                              |
| `extraExtensions` | `AnyExtension[]`          | —              | 追加 Tiptap 扩展                                            |
| `editorProps`     | `Record<string, unknown>` | —              | 透传 Tiptap `editorProps`（class 会与 `inline-prose` 合并） |

### InlineToolbarConfig

| 键            | 对应组件 / 能力                        |
| ------------- | -------------------------------------- |
| `undoRedo`    | `UndoRedoButton`                       |
| `heading`     | `HeadingControl`                       |
| `textFormat`  | `TextFormatButtons` + `Underline`      |
| `list`        | `ListTools`（含任务列表）              |
| `align`       | `AlignDropdown`                        |
| `link`        | `LinkButton`                           |
| `clearFormat` | `ClearFormatButton`                    |
| `font`        | `FontFamilySelect`, `FontSizeSelect`   |
| `codeBlock`   | `CodeBlockDropdown`（依赖 `lowlight`） |

仅 `=== true` 视为开启（opt-in）。

## Presets

```ts
import { inlinePresets, mergeInlinePreset } from "@yanivjs/yaniv-editor/inline";

inlinePresets.minimal; // undoRedo + textFormat
inlinePresets.comment; // + link
inlinePresets.form; // heading + textFormat + list + align
inlinePresets.rich; // 全部 9 项

mergeInlinePreset("comment", { toolbar: { list: true } });
// toolbar 深合并，不会丢失 comment 原有项
```

## Events

| 事件             | payload  | 说明          |
| ---------------- | -------- | ------------- |
| `update:content` | `string` | HTML 内容变更 |

## Slots

| 插槽      | 作用域 props         | 说明                     |
| --------- | -------------------- | ------------------------ |
| `toolbar` | `{ editor, config }` | 替换默认 `InlineToolbar` |

## Expose

```ts
interface YanivInlineEditorExpose {
  getEditor(): Editor | null;
  getJSON(): JSONContent | null;
  getHTML(): string;
  getText(): string;
}
```

## buildInlineExtensions

DIY 模式或自定义 Editor 生命周期时使用：

```ts
const toolbar = { undoRedo: true, textFormat: true, link: true };

const extensions = buildInlineExtensions({
  gates: resolveInlineExtensionGates({ toolbar }),
  placeholder: "写点什么…",
  extraExtensions: [],
});
```

::: warning strict 模式
工具栏关闭的项 **不会** 注册对应 extension。例如 `minimal` 预设下粘贴带链接的 HTML 可能丢失链接结构；需要渲染保留时可开启 `link` toolbar 或通过 `extraExtensions` 手动补充。
:::

## v1 约束

- `toolbar` 在 mount 时确定，运行时变更不会自动 re-init Editor
- `readonly` 下工具栏仍可见，命令无效（与 Full Editor 一致）

## 相关

- [Inline 按需拼装](/guide/inline-composition)
- [YanivEditor](/api/yaniv-editor)
