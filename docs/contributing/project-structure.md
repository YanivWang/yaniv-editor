# 项目结构

主要源码目录：

- `src/core`：公共 Vue 组件、会话生命周期和运行时编排。
- `src/core/runtime`：纯 profile/chrome/session-key 推导和 `useEditorRuntime`。
- `src/capabilities`：能力注册表、扩展构建器和工具栏 gate 映射。
- `src/configs`：公共配置类型和 Full/Inline 默认配置。
- `src/extensions`：Tiptap 扩展实现。
- `src/components/editor`：可复用编辑器控件。
- `src/components/tools`：编辑器 chrome 和上下文工具。
- `src/appearance`：外观和颜色工具。
- `src/styles`：显式 CSS 入口。

Full Editor API 决策位于 `src/core/editorTypes.ts`、`src/configs/editorPreset.ts` 和 `src/core/runtime/resolveEditorProfile.ts`。

Inline Editor 工具栏决策位于 `src/configs/inlineToolbar.ts` 和 `src/configs/inlineTypes.ts`。

Preset 默认能力仅在 `src/core/runtime/resolveEditorProfile.ts` 定义。`editorPreset.ts` 只拥有工具栏和布局默认值。

运行时架构见 [架构设计](./architecture.md)。完整 normative 文档见仓库根目录 [`ARCHITECTURE.md`](https://github.com/YanivWang/yaniv-editor/blob/main/ARCHITECTURE.md)。

## CSS 分层

样式分为结构层、功能 chrome 层和外观层。不要在外观文件中重复结构规则。

| 层级        | 位置                                                    | 职责                                            |
| ----------- | ------------------------------------------------------- | ----------------------------------------------- |
| Token       | `src/styles/variables.css`                              | `--ye-*` 设计 token（浅色/深色）                |
| 结构        | `src/styles/content.css`、`table.css`、`code-block.css` | ProseMirror 边框、背景和交互语义                |
| 功能 chrome | `src/styles/*.css`、`src/components/tools/**`           | 工具栏、菜单、拖拽手柄、大纲等                  |
| 外观        | `src/appearance/styles/*.css`                           | 主题 token 和排版（margin、font-size、padding） |

导入顺序在 `src/styles/index.css`（Full）和 `src/styles/inline.css`（Inline）中定义。两者均在外观 CSS 之前导入 `content.css`。

规则：

- 外观文件可覆盖 `--ye-*` token 并调整排版。
- 不要在结构文件（`content.css`、`table.css`、`code-block.css`）已拥有的选择器上重复声明 `border` / `background` 简写。
- `block-hover.css` 随 Full bundle 发布，但仅在 `.appearance-notion` 下生效（Notion 块悬停高亮）。
- `appearance="custom"` 无主题文件；在编辑器根节点通过 `:custom-appearance-vars` 覆盖 token。

宿主侧用法见 [外观与颜色](../guide/appearance.md)。
