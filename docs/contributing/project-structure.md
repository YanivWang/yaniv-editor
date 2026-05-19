# 项目结构

面向贡献者与二次开发者，说明源码目录划分、组件引用关系，以及新增功能时的放置约定。使用方集成文档见 [指南](/guide/getting-started) 与 [API](/api/yaniv-editor)。

## 目录边界

| 路径                    | 职责                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `src/components/base`   | 通用 UI 基元：按钮、分组、下拉按钮、Tooltip 等                       |
| `src/components/editor` | 依赖 `Editor` 实例的编辑器功能控件（标题、列表、颜色、图片、表格等） |
| `src/components/tools`  | 编辑器外围编排：头部工具栏、底部导航、浮动菜单、图片/表格工具栏等    |
| `src/features/ai`       | AI 适配器、扩展、菜单组件与配置                                      |
| `src/core`              | 主编辑器编排入口（`YanivEditor` 等）                                 |
| `src/configs`           | 公共配置、常量、功能预设、能力映射、工具栏/菜单类型                  |
| `src/extensions`        | Tiptap 扩展注册与自定义扩展                                          |

`src/components/editor` 存放**与 Tiptap 编辑器能力强绑定**的 UI 子模块，例如标题、列表、颜色、图片、表格、字号、格式刷、Word 导入导出等。

## 主要引用链

```text
src/index.ts
  -> src/core/YanivEditor.vue
    -> src/components/tools/header-nav/ToolbarNav.vue
      -> src/components/editor/*
      -> src/components/base/*
    -> src/extensions/coreExtensions.ts
    -> src/features/ai
    -> src/configs/editorConfig.ts
    -> src/configs/editorCapabilityMap.ts
```

## 导入建议

库内开发可使用路径别名：

```ts
import { TextFormatButtons } from "@/editor/text-format";
import { ToolbarNav, ADVANCED_TOOLBAR_CONFIG } from "@/tools/header-nav";
import { ToolbarButton } from "@/base";
import { editorPresets } from "@/configs/editorPresets";
```

对外集成时优先从包入口导入：

```ts
import { YanivEditor } from "@yanivjs/yaniv-editor";
```

## 新增功能约定

- 新增基础 UI → `src/components/base`
- 新增编辑器按钮、下拉框、菜单项 → `src/components/editor/<feature>`
- 新增围绕编辑器实例运行的浮层、导航、面板 → `src/components/tools/<tool>`
- 新增 Tiptap schema、mark、node、plugin、extension → `src/extensions`
- 新增功能开关、预设、常量、菜单类型 → `src/configs`

## 相关文档

- [Inline 按需拼装](/guide/inline-composition) — 按需引用 `editor` 组件的集成方式
- [功能配置](/api/features-config) — `version` 与 `features` 门控
- [FAQ · 反馈与贡献](/faq#反馈与贡献)
