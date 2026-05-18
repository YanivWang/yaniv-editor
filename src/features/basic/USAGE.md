# Basic 文件夹使用说明

## 📍 引用位置

`basic` 文件夹主要在以下位置被引入使用：

### 1. 核心编辑器组件

**文件：** `core/TiptapProEditor.vue`

```vue
<template>
  <ToolbarNav
    v-if="editorInstance"
    :editor="editorInstance"
    :config="toolbarConfig"
    class="word-toolbar"
  />
</template>

<script setup lang="ts">
// 公共工具栏（已迁移）
import { ToolbarNav, BASIC_TOOLBAR_CONFIG } from "../tools/header-nav";
</script>
```

### 2. 统一导出入口

**文件：** `components/tiptapPro-tenant/index.ts`

```typescript
// 核心编辑器
export { default as TiptapProEditor } from "./core/TiptapProEditor.vue";
```

### 3. 实际使用位置

**文件：** `views/tiptap-pro-tenant-demo/index.vue`

```vue
<template>
  <TiptapProEditor :version="'basic'" :initialContent="initialContent" @update="handleUpdate" />
</template>

<script setup lang="ts">
import { TiptapProEditor } from "#/components/tiptapPro-tenant";
</script>
```

## 🔗 引用链

```
views/tiptap-pro-tenant-demo/index.vue
  ↓ 导入
components/tiptapPro-tenant/index.ts
  ↓ 导出
core/TiptapProEditor.vue
  ↓ 引入
tools/header-nav/ToolbarNav.vue
  ↓ 使用
basic/text-format/TextFormatButtons.vue
basic/heading/HeadingDropdown.vue
basic/align/AlignDropdown.vue
basic/list/ListTools.vue
basic/color/ColorPicker.vue
```

## 📝 说明

- `basic` 文件夹是**基础版功能模块**，包含各种功能组件（文本格式、标题、对齐、列表、颜色等）
- 工具栏已迁移到 `tools/header-nav/ToolbarNav.vue`，支持可配置的工具显示
- 用户通过使用 `TiptapProEditor` 组件来使用基础版功能
- 可以通过 `versionConfig.features.headerNav` 配置来控制是否显示工具栏
