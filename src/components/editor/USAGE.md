# `src/components/editor` 使用说明

本目录存放**与 Tiptap 编辑器能力强绑定的 UI 子模块**，例如标题、列表、颜色、图片、表格、字号、格式刷、Word 导入导出等。

## 目录边界

- `src/components/base`：通用 UI 基元，例如按钮、分组、下拉按钮、Tooltip。
- `src/components/editor`：需要 `Editor` 实例才能工作的编辑器功能控件。
- `src/components/tools`：编辑器外围编排组件，例如头部工具栏、底部导航、浮动菜单、图片工具栏、表格工具栏、拖拽手柄菜单。
- `src/features/ai`：AI 适配器、AI 扩展、AI 菜单组件与配置。
- `src/core`：主编辑器编排入口，目前只保留 `TiptapProEditor` 相关核心文件。
- `src/configs`：公共配置、常量、功能预设、能力映射和工具栏/菜单类型。
- `src/extensions`：Tiptap 扩展注册与自定义扩展。

## 主要引用链

```text
src/index.ts
  -> src/core/TiptapProEditor.vue
    -> src/components/tools/header-nav/ToolbarNav.vue
      -> src/components/editor/*
      -> src/components/base/*
    -> src/extensions/coreExtensions.ts
    -> src/features/ai
    -> src/configs/editorConfig.ts
    -> src/configs/editorCapabilityMap.ts
```

## 导入建议

```ts
import { TextFormatButtons } from "@/editor/text-format";
import { ToolbarNav, ADVANCED_TOOLBAR_CONFIG } from "@/tools/header-nav";
import { ToolbarButton } from "@/base";
import { PRESET_CONFIGS } from "@/configs";
```

对外使用时优先从包入口导入：

```ts
import { TiptapProEditor } from "tiptap-ui-kit";
```

## 约定

- 新增基础 UI 时放入 `src/components/base`。
- 新增编辑器按钮、下拉框、菜单项时放入 `src/components/editor/<feature>`。
- 新增围绕编辑器实例运行的浮层、导航、面板时放入 `src/components/tools/<tool>`。
- 新增 Tiptap schema、mark、node、plugin、extension 时放入 `src/extensions`。
- 新增功能开关、预设、常量、菜单类型时优先放入 `src/configs`。
