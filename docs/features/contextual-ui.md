# 上下文 UI

除固定顶栏/底栏外，编辑器根据选区与 preset 显示上下文工具。

## 固定布局（Layout Chrome）

由 preset 的 `layout` 决定；页眉/页脚/浮动菜单/快捷键提示**不能**仅靠 `features` 重新打开。表格上下文条还额外要求 `features.table`（`uiFlags.tableTools = layout.tableTools && gates.table`）。

| 组件         | basic | full | notion | 备注                                   |
| ------------ | :---: | :--: | :----: | -------------------------------------- |
| 顶栏 Header  |  ✅   |  ✅  |   ❌   | preset layout                          |
| 底栏 Footer  |  ✅   |  ✅  |   ❌   | preset layout                          |
| 浮动文本菜单 |  ❌   |  ✅  |   ✅   | preset layout                          |
| 链接气泡     |  ✅   |  ✅  |   ✅   | preset layout                          |
| 表格工具     | ❌\*  |  ✅  |   ✅   | 需 `gates.table`；\*basic 默认关 table |
| 快捷键提示   |  ❌   |  ✅  |   ❌   | preset layout                          |

\* basic 在 `:features="{ table: true }"` 时也会显示表格上下文条（layout 已开 `tableTools`）。

底栏（basic / full）：缩放 50–200%、页数、字符数；full 含快捷键提示。

## 浮动文本菜单

仅在**存在非空文本选区**时出现（`shouldShowFloatingTextToolbar`），位置跟随选区；空行光标不触发。以下情形也会抑制它：选中的是 NodeSelection、光标位于代码块 / 表格 / 图片 / 视频 / 链接内、选区贴着媒体节点，或块拖拽进行中（`isBubbleMenuBlocked`）。

内容：标题下拉、粗/斜/下划线/删除线、文字色与高亮、链接、列表；AI gate 开启时追加 `AiMenuButton`。**不含**对齐与清除格式。

## 气泡 / 上下文条

| 选区类型   | UI                                                                           |
| ---------- | ---------------------------------------------------------------------------- |
| 链接       | 链接气泡 — 编辑 URL、取消链接                                                |
| 图片       | 图片上下文条 — 对齐、预览、删除（拖拽缩放来自节点手柄，不在此条内）          |
| 视频       | 视频上下文条 — 播放预览、删除                                                |
| 表格单元格 | 表格上下文条 — 增删行列、合并/拆分、表头行/列、删除整表（无单元格背景色 UI） |

## 块菜单

斜杠命令与拖拽手柄触发的 BlockPickerMenu（见 [块编辑](./block-editing.md)）。菜单通过 overlay portal 挂载，继承 `.yaniv-editor` 的 z-index token。

## 浮层挂载

bubble menu、BlockPicker、mention 建议、AI popover 等均挂载在 `EditorShell` 内的 `.yaniv-editor__overlay-portal`，不使用 `document.body`。层级配置见 [Z-Index 与浮层](../guide/z-index.md)。

## 移动端

视口 ≤768px 时（`matchMedia("(width <= 768px)")`），`ToolbarNav` 会把 `COMPACT_TOOLBAR_CONFIG` 作为掩码叠加到 preset 配置上，收敛为精简工具带。

COMPACT 在这里是**掩码**（取交集），只能进一步收窄工具带，不会重新打开 gate 已关闭的能力——例如 `preset="basic"`（AI gate 关闭）在窄屏下不会渲染 `AiMenuButton`。

## Session Loading

`sessionKey` 变化重建期间显示 skeleton 占位，避免 chrome 白屏闪烁。

## 相关

- [预览模式](../guide/preview-mode.md)
- [架构设计 — ChromePolicy](../contributing/architecture.md#chromepolicy)
