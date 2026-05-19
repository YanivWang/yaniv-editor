# YanivEditor

主编辑器组件，封装工具栏、扩展注册、分页布局与辅助 UI。

## 导入

```ts
import { YanivEditor } from "@yanivjs/yaniv-editor";
import type { YanivEditorProps, YanivEditorExpose } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
```

## Props

| Prop                | 类型                          | 默认值             | 说明                                                      |
| ------------------- | ----------------------------- | ------------------ | --------------------------------------------------------- |
| `initialContent`    | `string \| JSONContent`       | `'<p>开始编辑...'` | 初始内容，HTML 字符串或 ProseMirror JSON（`type: 'doc'`） |
| `features`          | `FeatureConfig`               | —                  | 功能门控，见 [功能配置](/api/features-config)             |
| `locale`            | `string`                      | `'zh-CN'`          | 界面语言                                                  |
| `themePreset`       | `ThemePreset`                 | `'default'`        | 视觉预设，CSS 按需加载                                    |
| `themeMode`         | `'light' \| 'dark' \| 'auto'` | `'light'`          | 明暗模式，`auto` 跟随系统                                 |
| `readonly`          | `boolean`                     | `false`            | 只读模式                                                  |
| `previewMode`       | `boolean`                     | `false`            | 预览模式（无工具栏、不可编辑）                            |
| `tableMenuShowMode` | `1 \| 2`                      | `2`                | 表格工具栏显示时机                                        |
| `zoomBarPlacement`  | `'bottom' \| 'belowToolbar'`  | `'bottom'`         | 缩放条位置                                                |

### FeatureConfig 速查

详见 [功能配置](/api/features-config)。推荐使用 `editorPresets.production`：

```vue
<YanivEditor v-bind="editorPresets.production" />
```

## Events

| 事件     | payload       | 说明                                          |
| -------- | ------------- | --------------------------------------------- |
| `update` | `JSONContent` | 文档变更时触发，payload 为 `editor.getJSON()` |

::: warning
组件**不支持** `v-model`。请使用 `@update` 或 `ref` 方法读取内容。
:::

## Expose（ref 方法）

```ts
interface YanivEditorExpose {
  getEditor(): Editor | null;
  getJSON(): JSONContent | null;
  getHTML(): string;
  getText(): string;
}
```

### 示例

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YanivEditor, editorPresets } from "@yanivjs/yaniv-editor";

const editorRef = ref<InstanceType<typeof YanivEditor> | null>(null);

function exportContent() {
  const json = editorRef.value?.getJSON();
  const html = editorRef.value?.getHTML();
  const text = editorRef.value?.getText();
  const tiptap = editorRef.value?.getEditor();
}
</script>

<template>
  <YanivEditor ref="editorRef" v-bind="editorPresets.production" @update="onUpdate" />
</template>
```

## 完整示例

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YanivEditor, editorPresets } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";

const editorRef = ref<InstanceType<typeof YanivEditor> | null>(null);

async function save() {
  await fetch("/api/docs/1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: editorRef.value?.getJSON() }),
  });
}
</script>

<template>
  <YanivEditor
    ref="editorRef"
    v-bind="editorPresets.production"
    locale="zh-CN"
    theme-preset="word"
    theme-mode="light"
    :initial-content="'<h1>标题</h1><p>正文</p>'"
    @update="(c) => console.log('updated', c)"
  />
</template>
```

## 类型导出

```ts
import type {
  FeatureConfig,
  EditorPresetProps,
  EditorPresetName,
  YanivEditorProps,
  YanivEditorExpose,
} from "@yanivjs/yaniv-editor";
```
