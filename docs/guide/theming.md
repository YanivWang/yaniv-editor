# 主题与样式

Yaniv Editor 通过 **单一 Design Token 文件** + **按需加载的预设 CSS** + **`data-theme` 明暗模式** 实现主题系统。

## 引入样式

最低要求（含全部功能模块样式与 token）：

```ts
import "@yanivjs/yaniv-editor/style.css";
```

**无需**再手动 import 各 `presets/*.css`——由 `YanivEditor` 根据 `themePreset` 自动按需加载。

## 组件 Props（推荐）

```vue
<template>
  <YanivEditor theme-preset="notion" theme-mode="auto" v-bind="editorPresets.notion" />
</template>

<script setup lang="ts">
import { YanivEditor, editorPresets } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
</script>
```

| Prop          | 类型                                                                | 默认      | 说明                            |
| ------------- | ------------------------------------------------------------------- | --------- | ------------------------------- |
| `themePreset` | `default` \| `word` \| `notion` \| `github` \| `typora` \| `custom` | `default` | 视觉皮肤（CSS 变量 + 布局差异） |
| `themeMode`   | `light` \| `dark` \| `auto`                                         | `light`   | 明暗模式；`auto` 跟随系统       |

主题类名与 `data-theme` 应用在 **编辑器根节点**（`.yaniv-editor`），不污染 `document.documentElement`。

## 皮肤 vs 功能配置

| 层       | 控制方式                                    | 作用                             |
| -------- | ------------------------------------------- | -------------------------------- |
| **皮肤** | `themePreset` + 预设 CSS                    | 颜色、字体、纸张布局、工具栏外观 |
| **功能** | `version` + `features` 或 `editorPresets.*` | 扩展注册、工具栏显隐、斜杠菜单等 |

Notion 风格示例（两者同时使用）：

```vue
<YanivEditor theme-preset="notion" theme-mode="light" v-bind="editorPresets.notion" />
```

- `theme-preset="notion"` → 加载 `notion.css`，应用 Notion 视觉
- `editorPresets.notion` → 隐藏顶栏、启用浮动菜单 / 斜杠命令等**行为配置**

## 编程式 API

```ts
import {
  registerTheme,
  resolveThemeMode,
  useResolvedThemeMode,
  watchSystemTheme,
  loadThemePreset,
  applyThemeToElement,
  editorThemeInjectionKey,
  useInjectEditorTheme,
} from "@yanivjs/yaniv-editor";
```

### 宿主外壳同步明暗

编辑器主题在 `.yaniv-editor` 上，Demo 顶栏/背景在 `.demo-app` 上。二者共用**同一份** `themeMode`，外壳用解析后的 `light | dark` 设置 `data-theme`：

```vue
<script setup lang="ts">
import { ref } from "vue";
import { YanivEditor, useResolvedThemeMode } from "@yanivjs/yaniv-editor";
import type { ThemeMode } from "@yanivjs/yaniv-editor";

const themeMode = ref<ThemeMode>("auto");
const resolvedShellTheme = useResolvedThemeMode(themeMode);
</script>

<template>
  <div class="demo-app" :data-theme="resolvedShellTheme">
    <header>...</header>
    <YanivEditor :theme-mode="themeMode" theme-preset="default" />
  </div>
</template>
```

`example-shell.css` 通过 `.demo-app[data-theme="dark"]` 切换 `--demo-*` 变量；Ant Design 可用 `resolvedShellTheme === 'dark' ? darkAlgorithm : defaultAlgorithm`。

### 自定义主题（custom）

```ts
import { registerTheme } from "@yanivjs/yaniv-editor";

registerTheme("custom", {
  "--tiptap-primary": "#6366f1",
  "--tiptap-bg": "#faf5ff",
  "--tiptap-text": "#1e1b4b",
});
```

```vue
<YanivEditor theme-preset="custom" theme-mode="light" />
```

变量名须为 `--tiptap-*`，完整列表见 `src/styles/variables.css`。

### 跟随系统（auto）

```vue
<YanivEditor theme-mode="auto" />
```

`themeMode="auto"` 时，编辑器内部会通过 `watchSystemTheme` 监听系统 `prefers-color-scheme` 并更新 `data-theme`。

也可在应用层手动监听：

```ts
const stop = watchSystemTheme((mode) => {
  console.log("system theme:", mode);
});
onUnmounted(stop);
```

### 子组件 inject

```ts
import { inject } from "vue";
import { editorThemeInjectionKey } from "@yanivjs/yaniv-editor";

const theme = inject(editorThemeInjectionKey);
theme?.setPreset("github");
```

## 可用预设

| 预设      | 说明                     |
| --------- | ------------------------ |
| `default` | 通用 Web 编辑器          |
| `word`    | Word / A4 纸张风格       |
| `notion`  | Notion 风格              |
| `github`  | GitHub 风格              |
| `typora`  | Typora 风格              |
| `custom`  | `registerTheme` 注入变量 |

## 布局类名（中性命名）

| 类名                            | 说明                       |
| ------------------------------- | -------------------------- |
| `.yaniv-editor.document-layout` | 编辑器根（原 `word-mode`） |
| `.document-toolbar`             | 顶栏工具栏                 |
| `.document-container`           | 可滚动文档区               |
| `.document-content`             | 编辑区 ProseMirror 容器    |

## 深色模式约定

全库统一使用 **`[data-theme="dark"]`**，不再使用 `.dark` 类名。

## 下一步

- [功能总览](/features/overview)
- [Full Editor](/guide/full-editor)
