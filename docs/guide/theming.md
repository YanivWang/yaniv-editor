# 主题与样式

Yaniv Editor 通过 **CSS 变量 + 主题预设类名** 实现视觉定制，支持明暗色切换。

## 引入样式

最低要求：

```ts
import "@yanivjs/yaniv-editor/style.css";
```

使用特定视觉预设时，额外引入对应 CSS：

```ts
import "@yanivjs/yaniv-editor/src/themes/presets/word.css";
import "@yanivjs/yaniv-editor/src/themes/presets/notion.css";
import "@yanivjs/yaniv-editor/src/themes/presets/github.css";
import "@yanivjs/yaniv-editor/src/themes/presets/typora.css";
```

## 切换主题

```ts
import { setTheme, toggleThemeMode, getTheme } from "@yanivjs/yaniv-editor";

// preset: default | notion | github | typora | word | custom
// mode: light | dark | auto
setTheme("notion", "light");

// 切换明暗
toggleThemeMode();

// 读取当前
const { preset, mode } = getTheme();
```

`setTheme` 会在 `document.documentElement` 上设置：

- 类名：`theme-{preset}`（default 除外）
- 属性：`data-theme="light" | "dark"`

## 可用预设

| 预设      | 风格           | 说明                                          |
| --------- | -------------- | --------------------------------------------- |
| `word`    | Microsoft Word | 分页文档、传统工具栏                          |
| `notion`  | Notion         | 极简固定栏 + 浮动格式化（配合 features 使用） |
| `github`  | GitHub         | 简洁开发者风格                                |
| `typora`  | Typora         | 专注写作视觉（非 Markdown 编辑模式）          |
| `default` | 默认           | 基础变量主题                                  |
| `custom`  | 自定义         | 通过 `registerTheme` 注入 CSS 变量            |

## Notion 风格配置

Notion 风格建议配合 `editorPresets.notion`（隐藏顶栏，启用浮动菜单、斜杠菜单、链接气泡与媒体/表格工具）：

```vue
<YanivEditor v-bind="editorPresets.notion" />
```

```ts
import { editorPresets } from "@yanivjs/yaniv-editor";

setTheme("notion", "light");
```

并在容器上添加 Demo 使用的 `theme-notion` 类（可选，用于 examples 额外样式）。

## 自定义主题

```ts
import { registerTheme, setTheme } from "@yanivjs/yaniv-editor";

registerTheme("custom", {
  "--editor-primary": "#6366f1",
  "--editor-bg": "#ffffff",
  "--editor-text": "#1f2937",
});

setTheme("custom", "light");
```

变量名参见 `src/styles/variables.css`。

## 响应式与设备视图

主题模块还提供设备视图 API（主要用于 Demo 设备框）：

```ts
import { setDeviceView, setOrientation } from "@yanivjs/yaniv-editor";

setDeviceView("mobile"); // pc | pad | mobile
setOrientation("portrait"); // portrait | landscape
```

会在 `document.documentElement` 设置 `data-device` 与 `data-orientation`。

## 国际化

编辑器 UI 文案通过 `locale` prop 控制：

```vue
<YanivEditor locale="zh-CN" />
```

支持：`zh-CN`、`zh-TW`、`en-US`。

也可在应用层初始化：

```ts
import { createI18n } from "@yanivjs/yaniv-editor";

createI18n({ locale: "zh-CN", fallbackLocale: "en-US" });
```

## 下一步

- [功能总览](/features/overview)
- [Full Editor](/guide/full-editor)
