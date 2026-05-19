# TiptapProEditor

主编辑器组件，封装工具栏、扩展注册、分页布局与辅助 UI。

## 导入

```ts
import { TiptapProEditor } from "yaniv-editor";
import type { TiptapProEditorProps, TiptapProEditorExpose } from "yaniv-editor";
import "yaniv-editor/style.css";
```

## Props

| Prop                | 类型                         | 默认值             | 说明                                          |
| ------------------- | ---------------------------- | ------------------ | --------------------------------------------- |
| `version`           | `'basic' \| 'advanced'`      | `'advanced'`       | 工具栏档位与扩展门控基准                      |
| `initialContent`    | `string \| object`           | `'<p>开始编辑...'` | 初始内容，支持 HTML 或 ProseMirror JSON       |
| `features`          | `FeatureConfig`              | —                  | 功能门控，见 [功能配置](/api/features-config) |
| `locale`            | `string`                     | `'zh-CN'`          | 界面语言                                      |
| `readonly`          | `boolean`                    | `false`            | 只读模式                                      |
| `previewMode`       | `boolean`                    | `false`            | 预览模式（无工具栏、不可编辑）                |
| `documentId`        | `string`                     | —                  | 预留字段，当前不触发加载/保存                 |
| `tableMenuShowMode` | `1 \| 2`                     | `2`                | 表格工具栏显示时机                            |
| `zoomBarPlacement`  | `'bottom' \| 'belowToolbar'` | `'bottom'`         | 缩放条位置                                    |

### FeatureConfig 速查

详见 [功能配置](/api/features-config)。

## Events

| 事件     | payload       | 说明                                          |
| -------- | ------------- | --------------------------------------------- |
| `update` | `JSONContent` | 文档变更时触发，payload 为 `editor.getJSON()` |

::: warning
组件**不支持** `v-model`。请使用 `@update` 或 `ref` 方法读取内容。
:::

## Expose（ref 方法）

```ts
interface TiptapProEditorExpose {
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
import { TiptapProEditor } from "yaniv-editor";

const editorRef = ref<InstanceType<typeof TiptapProEditor> | null>(null);

function exportContent() {
  const json = editorRef.value?.getJSON();
  const html = editorRef.value?.getHTML();
  const text = editorRef.value?.getText();
  const tiptap = editorRef.value?.getEditor();
  // tiptap 可用于执行自定义 Tiptap 命令
}
</script>

<template>
  <TiptapProEditor ref="editorRef" version="advanced" @update="onUpdate" />
</template>
```

## 完整示例

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { TiptapProEditor, setTheme } from "yaniv-editor";
import "yaniv-editor/style.css";
import "yaniv-editor/src/themes/presets/word.css";

const editorRef = ref<InstanceType<typeof TiptapProEditor> | null>(null);

onMounted(() => setTheme("word", "light"));

async function save() {
  await fetch("/api/docs/1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: editorRef.value?.getJSON() }),
  });
}
</script>

<template>
  <TiptapProEditor
    ref="editorRef"
    version="advanced"
    locale="zh-CN"
    :initial-content="'<h1>标题</h1><p>正文</p>'"
    :features="{
      headerNav: true,
      footerNav: true,
      floatingMenu: true,
      slashCommand: true,
      linkBubbleMenu: true,
      tableToolbar: true,
      ai: true,
    }"
    @update="(c) => console.log('updated', c)"
  />
</template>
```

## 类型导出

```ts
import type {
  EditorVersion,
  FeatureConfig,
  EditorPresetProps,
  EditorPresetName,
  TiptapProEditorProps,
  TiptapProEditorExpose,
  EditorInstance,
} from "yaniv-editor";
```

## 相关

- [功能配置](/api/features-config)
- [resolveExtensionGates](/api/features-config#resolveextensiongates)
