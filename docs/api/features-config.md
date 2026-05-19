# 功能配置

yaniv-editor 有两套相关的配置类型，集成时以 **`FeatureConfig`**（`TiptapProEditor.features`）为准。

## FeatureConfig（TiptapProEditor）

定义于 `src/core/editorTypes.ts`，控制**扩展注册**与**部分 UI**。

| 字段                  | 类型      | 默认                           | 说明                 |
| --------------------- | --------- | ------------------------------ | -------------------- |
| `table`               | `boolean` | `true`                         | 表格扩展             |
| `image`               | `boolean` | `true`                         | 图片、视频、粘贴图片 |
| `math`                | `boolean` | `true`                         | 数学公式             |
| `ai`                  | `boolean` | `true`                         | AI 相关扩展          |
| `formatPainter`       | `boolean` | basic=`false`，advanced=`true` | 格式刷               |
| `outline`             | `boolean` | basic=`false`，advanced=`true` | 标题 ID + 目录扩展   |
| `searchReplace`       | `boolean` | basic=`false`，advanced=`true` | 查找替换             |
| `officePaste`         | `boolean` | `true`                         | Office/WPS 粘贴增强  |
| `tableToolbar`        | `boolean` | `false`                        | 表格上下文工具栏 UI  |
| `mention`             | `boolean` | —                              | **预留，未实现**     |
| `slashCommand`        | `boolean` | `false`                        | 斜杠命令菜单         |
| `dragHandle`          | `boolean` | `true`                         | 块拖拽手柄           |
| `floatingMenu`        | `boolean` | `false`                        | 选区浮动菜单         |
| `linkBubbleMenu`      | `boolean` | `false`                        | 链接气泡             |
| `headerNav`           | `boolean` | `false`                        | 顶部工具栏           |
| `footerNav`           | `boolean` | `false`                        | 底部导航/字数        |
| `statusShortcutHints` | `boolean` | `true`                         | 底部快捷键提示       |

### 推荐生产配置

```vue
<TiptapProEditor
  version="advanced"
  :features="{
    headerNav: true,
    footerNav: true,
    floatingMenu: true,
    slashCommand: true,
    linkBubbleMenu: true,
    tableToolbar: true,
    image: true,
    table: true,
    ai: true,
    searchReplace: true,
    officePaste: true,
  }"
/>
```

## FeatureFlags（PRESET_CONFIGS）

定义于 `src/configs/editorConfig.ts`，用于 **examples 预设**与文档演示，字段更偏工具栏粒度（`heading`、`textFormat`、`zoom` 等）。

```ts
import { PRESET_CONFIGS, mergeConfig } from "yaniv-editor";

mergeConfig("full", { locale: "zh-CN" });
mergeConfig("notion");
```

::: warning 类型差异
`FeatureFlags` 与 `FeatureConfig` 字段**不完全相同**。传给 `TiptapProEditor` 的 `features` 应使用 `FeatureConfig`；未被识别的字段（如 `heading: false`）不会生效。
:::

## resolveExtensionGates

统一解析扩展层门控，避免 UI 关闭但扩展仍注册。

```ts
import { resolveExtensionGates } from "yaniv-editor";

const gates = resolveExtensionGates({
  version: "advanced",
  features: { ai: false, table: true },
});
// { table, image, math, ai, formatPainter, outline, searchReplace, officePaste }
```

### 解析规则

| 能力                                          | 规则                                                               |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `table` / `image` / `math`                    | 显式 `false` 才关闭，否则 `true`                                   |
| `ai`                                          | `features.ai` 或 `versionConfig.features.ai` 任一为 `false` 则关闭 |
| `formatPainter` / `outline` / `searchReplace` | 显式优先；未指定时 advanced/premium 为 `true`                      |
| `officePaste`                                 | 默认 `true`，显式 `false` 关闭                                     |

## 工具栏与扩展对齐

`applyExtensionGatesToToolbarConfig` 确保工具栏按钮与扩展一致：

```ts
import {
  ADVANCED_TOOLBAR_CONFIG,
  applyExtensionGatesToToolbarConfig,
  resolveExtensionGates,
} from "yaniv-editor";

const gates = resolveExtensionGates({ version: "advanced" });
const toolbar = applyExtensionGatesToToolbarConfig(ADVANCED_TOOLBAR_CONFIG, gates);
```

映射关系（`CAPABILITY_TO_GATE`）：

| 工具栏能力      | 扩展 gate       |
| --------------- | --------------- |
| `table`         | `table`         |
| `image`         | `image`         |
| `formatPainter` | `formatPainter` |
| `ai`            | `ai`            |
| `findReplace`   | `searchReplace` |

## VersionConfig

```ts
interface VersionConfig {
  version?: "basic" | "advanced" | "premium";
  features?: {
    basic?: boolean;
    advanced?: boolean;
    ai?: boolean;
    headerNav?: boolean;
    footerNav?: boolean;
    previewMode?: boolean;
  };
}
```

## 变更 features 的行为

修改 `features` 中影响扩展注册的门控字段时，`TiptapProEditor` 会**重建编辑器实例**以保持扩展与 UI 一致。

## 相关

- [TiptapProEditor](/api/tiptap-pro-editor)
- [功能总览](/features/overview)
