# 功能配置

集成 `YanivEditor` 通过 **`features`** 控制扩展注册与 UI 显隐；推荐使用 **`editorPresets`** 作为起点。

```text
最终能力 = resolveExtensionGates(features) → applyExtensionGatesToToolbarConfig
```

## FeatureConfig

定义于 `src/core/editorTypes.ts`。

| 字段                  | 类型                  | 默认    | 说明                             |
| --------------------- | --------------------- | ------- | -------------------------------- |
| `table`               | `boolean`             | `true`  | 表格扩展                         |
| `image`               | `boolean`             | `true`  | 图片、视频、粘贴图片             |
| `math`                | `boolean`             | `true`  | 数学公式                         |
| `ai`                  | `boolean`             | `true`  | AI 相关扩展                      |
| `formatPainter`       | `boolean`             | `true`  | 格式刷                           |
| `outline`             | `boolean`             | `true`  | 标题 ID + 目录扩展 + 侧栏大纲 UI |
| `searchReplace`       | `boolean`             | `true`  | 查找替换                         |
| `officePaste`         | `boolean`             | `true`  | Office/WPS 粘贴增强              |
| `tableToolbar`        | `boolean`             | `false` | 表格上下文工具栏 UI              |
| `toolbar`             | `'full' \| 'compact'` | `full`  | 顶栏工具按钮密度                 |
| `slashCommand`        | `boolean`             | `false` | 斜杠命令菜单                     |
| `dragHandle`          | `boolean`             | `true`  | 块添加、块菜单与拖拽             |
| `floatingMenu`        | `boolean`             | `false` | 选区浮动菜单                     |
| `linkBubbleMenu`      | `boolean`             | `false` | 链接气泡                         |
| `headerNav`           | `boolean`             | `false` | 顶部工具栏                       |
| `footerNav`           | `boolean`             | `false` | 底部导航/字数                    |
| `statusShortcutHints` | `boolean`             | `true`  | 底部快捷键提示                   |

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
    table: true,
    ai: true,
    searchReplace: true,
    officePaste: true,
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

| 名称         | 说明                                                  |
| ------------ | ----------------------------------------------------- |
| `production` | 生产推荐（完整工具栏 + 常用模块）                     |
| `basic`      | 精简工具栏 + 顶栏，关闭表格/公式/格式刷/大纲/查找替换 |
| `minimal`    | 精简工具栏，无顶栏                                    |
| `notion`     | 隐藏顶栏，启用浮动菜单、斜杠菜单与块级操作体验        |

## resolveExtensionGates

高级接入：统一解析扩展层门控。

```ts
import { resolveExtensionGates } from "@yanivjs/yaniv-editor";

const gates = resolveExtensionGates({
  features: { ai: false, table: true },
});
```

### 解析规则

未在 `features` 中声明的扩展能力**默认开启**；显式 `false` 则关闭。

## 工具栏与扩展对齐

`applyExtensionGatesToToolbarConfig` 确保工具栏按钮与扩展一致（见 `editorCapabilityMap`）。

## 变更 features 的行为

修改影响扩展注册的门控字段时，`YanivEditor` 会**重建编辑器实例**以保持扩展与 UI 一致。

## 相关

- [YanivEditor](/api/yaniv-editor)
- [功能总览](/features/overview)
