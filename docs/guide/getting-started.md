# 快速开始

本指南帮助你在 Vue 3 项目中集成 **Yaniv Editor**（npm：`@yanivjs/yaniv-editor`），并在 10 分钟内跑通基础编辑与内容保存。

## 安装

```bash
pnpm add @yanivjs/yaniv-editor
# 或
npm install @yanivjs/yaniv-editor
```

### Peer Dependencies

宿主项目需安装以下依赖（版本见 `package.json` 的 `peerDependencies`）：

- `vue` ^3.4
- `@tiptap/core` ^3.0
- `@tiptap/vue-3` ^3.0
- `@tiptap/starter-kit` ^3.0
- `@tiptap/pm` ^3.0
- `ant-design-vue` ^4.0
- `@ant-design/icons-vue` ^7.0
- `lowlight` ^3.0

完整工具栏还会用到若干 `@tiptap/extension-*` 包，请以 `package.json` 的 `peerDependencies` 为准。

## 最小示例

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YanivEditor, editorPresets } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";

const editorRef = ref<InstanceType<typeof YanivEditor> | null>(null);
const doc = ref<unknown>(null);

function onUpdate(content: unknown) {
  doc.value = content;
}

function save() {
  const html = editorRef.value?.getHTML();
  const json = editorRef.value?.getJSON();
  // 发送到后端 API
  console.log({ html, json });
}
</script>

<template>
  <YanivEditor
    ref="editorRef"
    v-bind="editorPresets.production"
    locale="zh-CN"
    :initial-content="'<p>Hello Yaniv!</p>'"
    @update="onUpdate"
  />
  <button type="button" @click="save">保存</button>
</template>
```

::: warning 注意
`YanivEditor` **不支持** `v-model`。请通过 `@update` 监听内容变化，或使用 `ref` 调用 `getJSON()` / `getHTML()` / `getText()` 读取内容。
:::

## 推荐配置（生产环境）

```vue
<YanivEditor
  ref="editorRef"
  v-bind="editorPresets.production"
  locale="zh-CN"
  :initial-content="loadedContent"
  @update="handleUpdate"
/>
```

## 内容持久化

编辑器本身**不包含**保存/加载 API，需由业务层实现：

```ts
// 保存：监听 @update 或定时/手动调用
const json = editorRef.value?.getJSON();
await fetch("/api/documents/123", {
  method: "PUT",
  body: JSON.stringify({ content: json }),
});

// 加载：传入 initialContent
const res = await fetch("/api/documents/123");
const { content } = await res.json();
// content 为 HTML 字符串或 ProseMirror JSON（type: 'doc'）
```

## 预设配置

使用与 props 同构的 `editorPresets`，可直接 `v-bind`：

```vue
<script setup>
import { editorPresets, mergeEditorPreset } from "@yanivjs/yaniv-editor";

const editorProps = mergeEditorPreset("production", {
  features: { ai: false },
});
</script>

<template>
  <YanivEditor locale="zh-CN" initial-content="<p>Hello</p>" v-bind="editorProps" />
</template>
```

详见 [功能配置](/api/features-config)。

## 下一步

- [Full Editor 集成指南](/guide/full-editor)
- [Inline 按需拼装](/guide/inline-composition)
- [主题与样式](/guide/theming)
- [功能总览](/features/overview)
