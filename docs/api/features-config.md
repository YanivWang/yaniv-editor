# 功能配置

集成 `YanivEditor` 通过 **`features`** 控制扩展注册与 UI 显隐；推荐使用 **`editorPresets`** 作为起点。

```text
最终能力 = resolveExtensionGates(features) → applyExtensionGatesToToolbarConfig
```

## FeatureConfig

定义于 `src/core/editorTypes.ts`。

| 字段                  | 类型                  | 默认    | 说明                             |
| --------------------- | --------------------- | ------- | -------------------------------- |
| `table`               | `boolean`             | `false` | 表格扩展                         |
| `image`               | `boolean`             | `false` | 图片扩展、粘贴图片、图片工具栏   |
| `video`               | `boolean`             | `false` | 视频扩展、视频工具栏             |
| `math`                | `boolean`             | `false` | 数学公式                         |
| `ai`                  | `boolean`             | `false` | AI 相关扩展                      |
| `formatPainter`       | `boolean`             | `false` | 格式刷                           |
| `outline`             | `boolean`             | `false` | 标题 ID + 目录扩展 + 侧栏大纲 UI |
| `searchReplace`       | `boolean`             | `false` | 查找替换                         |
| `officePaste`         | `boolean`             | `false` | Office/WPS 粘贴增强              |
| `slashCommand`        | `boolean`             | `false` | 斜杠命令菜单                     |
| `dragHandle`          | `boolean`             | `false` | 块添加、块菜单与拖拽             |
| `tableToolbar`        | `boolean`             | `false` | 表格上下文工具栏 UI              |
| `floatingMenu`        | `boolean`             | `false` | 选区浮动菜单                     |
| `linkBubbleMenu`      | `boolean`             | `false` | 链接气泡                         |
| `headerNav`           | `boolean`             | `false` | 顶部工具栏                       |
| `footerNav`           | `boolean`             | `false` | 底部导航/字数                    |
| `statusShortcutHints` | `boolean`             | `false` | 底部快捷键提示                   |
| `toolbar`             | `'full' \| 'compact'` | `full`  | 顶栏工具按钮密度（非布尔门控）   |

### 手写配置

```vue
<YanivEditor
  :features="{
    headerNav: true,
    footerNav: true,
    floatingMenu: true,
    slashCommand: true,
    linkBubbleMenu: true,
    tableToolbar: true,
    image: true,
    video: true,
    table: true,
    ai: true,
    searchReplace: true,
    officePaste: true,
    dragHandle: true,
  }"
/>
```

## editorPresets（推荐）

预设与 `features` **同构**，可直接 `v-bind`：

```ts
import { editorPresets, mergeEditorPreset } from "@yanivjs/yaniv-editor";

editorPresets.production; // 生产推荐
editorPresets.notion; // Notion 风格（无顶栏 + 浮动菜单 + 斜杠菜单）
mergeEditorPreset("production", { features: { ai: false } });
```

```vue
<YanivEditor v-bind="editorPresets.production" />
```

| 名称         | 说明                                           |
| ------------ | ---------------------------------------------- |
| `production` | 生产推荐（完整工具栏 + 常用模块）              |
| `basic`      | 精简工具栏 + 顶栏（图片、AI）                  |
| `minimal`    | 精简工具栏，无顶栏                             |
| `notion`     | 隐藏顶栏，启用浮动菜单、斜杠菜单与块级操作体验 |

## resolveExtensionGates

高级接入：统一解析扩展层门控。

```ts
import { resolveExtensionGates, isFeatureEnabled } from "@yanivjs/yaniv-editor";

const gates = resolveExtensionGates({
  features: { ai: true, table: true },
});

isFeatureEnabled({ headerNav: true }, "headerNav"); // true
```

### 解析规则

所有布尔能力均为 **opt-in**：须显式 `true` 才开启；未声明或为 `false` 均关闭。

## 工具栏与扩展对齐

`applyExtensionGatesToToolbarConfig` 确保工具栏按钮与扩展一致（见 `editorCapabilityMap`）。

## 变更 features 的行为

修改影响扩展注册的门控字段时，`YanivEditor` 会**重建编辑器实例**以保持扩展与 UI 一致。

## 相关

- [YanivEditor](/api/yaniv-editor)
- [功能总览](/features/overview)
