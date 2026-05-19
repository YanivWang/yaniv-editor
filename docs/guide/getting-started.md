# 快速开始

本指南帮助你在 Vue 3 项目中集成 `yaniv-editor`，并在 10 分钟内跑通基础编辑与内容保存。

## 安装

```bash
pnpm add yaniv-editor
# 或
npm install yaniv-editor
```

### Peer Dependencies

宿主项目需安装以下依赖（版本见 `package.json` 的 `peerDependencies`）：

- `vue` ^3.4
- `@tiptap/core` ^3.0
- `@tiptap/vue-3` ^3.0
- `@tiptap/starter-kit` ^3.0
- `@tiptap/pm` ^3.0

可选（完整 UI 体验推荐安装）：

- `ant-design-vue`
- `@ant-design/icons-vue`

## 最小示例

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TiptapProEditor } from "yaniv-editor";
import "yaniv-editor/style.css";

const editorRef = ref<InstanceType<typeof TiptapProEditor> | null>(null);
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
  <TiptapProEditor
    ref="editorRef"
    version="advanced"
    locale="zh-CN"
    :initial-content="'<p>Hello yaniv-editor</p>'"
    :features="{
      headerNav: true,
      footerNav: true,
    }"
    @update="onUpdate"
  />
  <button type="button" @click="save">保存</button>
</template>
```

::: warning 注意
`TiptapProEditor` **不支持** `v-model`。请通过 `@update` 监听内容变化，或使用 `ref` 调用 `getJSON()` / `getHTML()` / `getText()` 读取内容。
:::

## 推荐配置（生产环境）

```vue
<TiptapProEditor
  ref="editorRef"
  version="advanced"
  locale="zh-CN"
  :initial-content="loadedContent"
  :features="{
    headerNav: true,
    footerNav: true,
    floatingMenu: true,
    slashCommand: true,
    linkBubbleMenu: true,
    tableToolbar: true,
    image: true,
    ai: true,
  }"
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
// content 可以是 HTML 字符串或 ProseMirror JSON
```

`documentId` prop 已预留用于未来扩展，**当前版本不会自动加载或保存文档**。

## 版本选择

| version    | 说明                               |
| ---------- | ---------------------------------- |
| `basic`    | 基础工具栏，无格式刷/查找替换/大纲 |
| `advanced` | **默认**，完整工具栏与进阶扩展     |

工具栏按钮范围由 `version` 决定；扩展是否注册由 `features` 与 `resolveExtensionGates` 共同决定。详见 [功能配置](/api/features-config)。

## 预设配置

使用与 props 同构的 `editorPresets`，可直接 `v-bind`：

```vue
<script setup>
import { editorPresets, mergeEditorPreset } from "yaniv-editor";

const editorProps = mergeEditorPreset("production", {
  features: { ai: false },
});
</script>

<template>
  <TiptapProEditor locale="zh-CN" initial-content="<p>Hello</p>" v-bind="editorProps" />
</template>
```

详见 [功能配置](/api/features-config)。

## 下一步

- [Full Editor 集成指南](/guide/full-editor)
- [Inline 按需拼装](/guide/inline-composition)
- [主题与样式](/guide/theming)
- [功能总览](/features/overview)
