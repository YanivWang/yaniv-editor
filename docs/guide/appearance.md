# 外观与颜色

视觉配置分为两个 prop：

- `appearance`：`default | word | notion | custom`。
- `colorMode`：`light | dark | auto`。

```vue
<YanivEditor appearance="notion" color-mode="auto" />
```

`appearance="notion"` 仅影响视觉。`preset="notion"` 控制块编辑功能方案。两者可独立或组合使用：

```vue
<YanivEditor preset="basic" appearance="notion" />
<YanivEditor preset="notion" appearance="default" />
<YanivEditor preset="notion" appearance="notion" />
```

## 自定义外观

使用 `appearance="custom"` 并在编辑器实例上传入 `customAppearanceVars`：

```vue
<YanivEditor
  appearance="custom"
  :custom-appearance-vars="{
    '--ye-primary': '#6366f1',
    '--ye-bg': '#f8fafc',
  }"
/>
```

## 工具函数

```ts
import {
  loadAppearance,
  preloadAppearances,
  applyCustomAppearanceToElement,
  resolveColorMode,
  useResolvedColorMode,
  watchSystemColorMode,
} from "@yanivjs/yaniv-editor";
```

所有内置外观 CSS 由 `@yanivjs/yaniv-editor/style.css` 提供。`loadAppearance` 和 `preloadAppearances` 保持公共 API 异步，但仅标记内置外观为就绪。

## CSS 架构

ProseMirror 结构样式（段落、列表、引用、行内代码、表格、代码块）位于 `src/styles/content.css`、`table.css` 和 `code-block.css`。外观文件只修改 token 和排版。

Notion 块悬停高亮在 `src/styles/block-hover.css`，仅在根节点带有 `appearance-notion` 时生效。

贡献者规则与文件布局见 [项目结构 — CSS 分层](../contributing/project-structure.md#css-layering)。
