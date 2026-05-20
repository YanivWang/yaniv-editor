# 主题与样式

Yaniv Editor 通过 **单一 Design Token 文件** + **按需加载的预设 CSS** + **`data-theme` 明暗模式** 实现主题系统。

## 引入样式

Yaniv Editor 对外提供两个样式入口：Full Editor 使用完整主题 `style.css`，Inline 拼装使用轻量工具栏主题 `inline.css`。入口文件只负责聚合内部 CSS 模块，业务代码不要拆片引入内部文件。

### Full Editor

```ts
import { YanivEditor, editorPresets } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
```

### Inline 拼装

```ts
import { HeadingControl } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";
```

`style.css` ≡ 源码 `src/styles/index.css`，聚合 Full Editor 所需的完整功能样式与 Design Token。
`inline.css` ≡ 源码 `src/styles/inline.css`，聚合 Inline 工具栏组件第一版所需的轻量基础样式。

**无需**再手动 import `toolbar-dropdown.css`、`heading-dropdown.css` 等 `src/styles/` 内单个文件——这些仅供库内部聚合，**不是**对外 API。

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

主题类名与 `data-theme` 应用在 **编辑器根节点**（`.yaniv-editor`）。

## 皮肤 vs 功能配置

| 层       | 控制方式                        | 作用                             |
| -------- | ------------------------------- | -------------------------------- |
| **皮肤** | `themePreset` + 预设 CSS        | 颜色、字体、纸张布局、工具栏外观 |
| **功能** | `features` 或 `editorPresets.*` | 扩展注册、工具栏显隐、斜杠菜单等 |

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
  "--ye-primary": "#6366f1",
  "--ye-bg": "#faf5ff",
  "--ye-text": "#1e1b4b",
});
```

```vue
<YanivEditor theme-preset="custom" theme-mode="light" />
```

变量名须为 `--ye-*`。完整定义见 `src/styles/variables.css`；下表为**可覆盖的公开 token**（`registerTheme` / 预设 CSS 请只改这些）。

### Design Token 参考

| 分类     | 变量                                                     | 说明                                                    |
| -------- | -------------------------------------------------------- | ------------------------------------------------------- |
| 主色     | `--ye-primary`                                           | 主色、链接、激活态                                      |
|          | `--ye-primary-hover`                                     | 主色悬停                                                |
|          | `--ye-primary-light`                                     | 主色浅底（选中、激活背景）                              |
| 语义     | `--ye-danger`                                            | 危险操作文字/边框                                       |
|          | `--ye-danger-bg`                                         | 危险操作背景                                            |
| 表面     | `--ye-bg`                                                | 主背景                                                  |
|          | `--ye-bg-secondary`                                      | 次级背景、侧栏、代码块浅底                              |
|          | `--ye-bg-hover`                                          | 悬停背景                                                |
| 文字     | `--ye-text`                                              | 主文字                                                  |
|          | `--ye-text-secondary`                                    | 次要文字                                                |
|          | `--ye-text-muted`                                        | 弱化、占位                                              |
|          | `--ye-placeholder-color`                                 | 编辑器占位符                                            |
| 边框     | `--ye-border`                                            | 默认边框                                                |
|          | `--ye-border-hover`                                      | 边框悬停                                                |
|          | `--ye-border-focus`                                      | 焦点边框（通常等于 primary）                            |
| 选区     | `--ye-selection`                                         | 文本选区背景                                            |
|          | `--ye-caret`                                             | 光标颜色                                                |
| 工具栏   | `--ye-toolbar-bg`                                        | 顶栏背景                                                |
|          | `--ye-toolbar-border`                                    | 顶栏底边                                                |
|          | `--ye-toolbar-btn-text`                                  | 工具栏按钮文字                                          |
|          | `--ye-toolbar-btn-hover`                                 | 工具栏按钮悬停                                          |
|          | `--ye-toolbar-btn-active`                                | 工具栏按钮按下                                          |
|          | `--ye-toolbar-btn-disabled`                              | 禁用按钮                                                |
|          | `--ye-toolbar-divider`                                   | 工具栏分隔线                                            |
| 气泡菜单 | `--ye-bubble-bg`                                         | 气泡/浮动菜单背景                                       |
|          | `--ye-bubble-shadow`                                     | 气泡阴影                                                |
|          | `--ye-bubble-border`                                     | 气泡边框                                                |
| 按钮尺寸 | `--ye-btn-size`                                          | 菜单内按钮宽高（默认 32px）                             |
|          | `--ye-btn-size-sm`                                       | 小屏按钮（默认 28px）                                   |
|          | `--ye-btn-icon-size`                                     | 菜单按钮图标字号                                        |
| 代码     | `--ye-code-bg` / `--ye-code-text`                        | 行内代码                                                |
|          | `--ye-codeblock-bg` / `--ye-codeblock-text`              | 代码块                                                  |
| 表格     | `--ye-table-border`                                      | 表格边框                                                |
|          | `--ye-table-header-bg`                                   | 表头背景                                                |
|          | `--ye-table-selected`                                    | 选中单元格高亮                                          |
| 引用     | `--ye-blockquote-border` / `--ye-blockquote-bg`          | 引用块                                                  |
| 链接     | `--ye-link` / `--ye-link-hover`                          | 文档内链接                                              |
| 排版     | `--ye-font-family` / `--ye-font-mono`                    | 字体                                                    |
|          | `--ye-font-size` / `--ye-line-height`                    | 字号与行高                                              |
| 间距     | `--ye-spacing-xs` … `--ye-spacing-xl`                    | 4px 阶梯                                                |
| 圆角     | `--ye-radius-sm` … `--ye-radius-full`                    | 圆角                                                    |
| 阴影     | `--ye-shadow-sm` / `--md` / `--lg`                       | 阴影                                                    |
| 动效     | `--ye-transition-fast` / `--normal` / `--slow`           | 过渡时长                                                |
| 层级     | `--ye-z-toolbar` / `--dropdown` / `--bubble` / `--modal` | z-index                                                 |
| 文档布局 | `--ye-doc-page-width`                                    | 纸张/内容区最大宽度                                     |
|          | `--ye-doc-page-min-height`                               | 单页最小高度                                            |
|          | `--ye-doc-padding-top` / `--bottom` / `--inline`         | 编辑区内边距                                            |
|          | `--ye-doc-page-padding`                                  | `.continuous-pages` 外层 padding（如 Notion 左右 96px） |
|          | `--ye-doc-container-padding-y`                           | 滚动容器上下留白                                        |
|          | `--ye-doc-page-cut-height`                               | 分页裁切线高度（预留）                                  |
| 大纲     | `--ye-outline-scroll-offset`                             | 大纲跳转留白与高亮阈值（唯一数据源，默认 80px）         |

文档布局尺寸由 `variables.css` 提供默认值（A4），各 **theme preset**（`src/themes/presets/*.css`）覆盖；Word 分页时 `useEditorPagination` 会在运行时写入同名字符串变量。

组件样式应直接使用 `var(--ye-*)`，不要写硬编码 fallback。基础组件类名前缀为 `ye-`（如 `ye-toolbar-button`）。

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
// theme.preset / theme.mode / theme.resolvedMode 为只读，请改 YanivEditor props
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

| 类名                            | 说明                    |
| ------------------------------- | ----------------------- |
| `.yaniv-editor.document-layout` | 编辑器根                |
| `.yaniv-editor-host`            | 可选宿主容器，限定高度  |
| `.document-toolbar`             | 顶栏工具栏              |
| `.document-container`           | 可滚动文档区            |
| `.document-content`             | 编辑区 ProseMirror 容器 |

长文档时仅 `.document-container` 滚动，顶栏、悬浮大纲与底栏固定。宿主需提供限定高度（如 `height: 100vh` 或 flex 子项 `flex: 1; min-height: 0`），可在外层使用 `.yaniv-editor-host`。点击大纲项时，目标标题会滚至滚动区上方约 `--ye-outline-scroll-offset` 处并聚焦，便于编辑。

## 深色模式约定

全库统一使用 **`[data-theme="dark"]`**。

## 下一步

- [功能总览](/features/overview)
- [Full Editor](/guide/full-editor)
