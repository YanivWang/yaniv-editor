# 上下文 UI

除固定顶栏/底栏外，编辑器根据选区与 preset 显示上下文工具。

## 固定布局（Layout Chrome）

由 preset 决定，**不能**通过 `features` 开关：

| 组件         | basic | full | notion |
| ------------ | :---: | :--: | :----: |
| 顶栏 Header  |  ✅   |  ✅  |   ❌   |
| 底栏 Footer  |  ✅   |  ✅  |   ❌   |
| 浮动文本菜单 |  ❌   |  ✅  |   ✅   |
| 链接气泡     |  ✅   |  ✅  |   ✅   |
| 表格工具     |  ✅   |  ✅  |   ✅   |
| 快捷键提示   |  ❌   |  ✅  |   ❌   |

底栏（basic / full）：缩放 50–200%、页数、字符数；full 含快捷键提示。

## 浮动文本菜单

选中文本或空行行首出现，提供格式、颜色、链接、列表等（notion / full）。AI 入口在 AI gate 开启时出现。

## 气泡 / 上下文条

| 选区类型   | UI                                    |
| ---------- | ------------------------------------- |
| 链接       | 链接气泡 — 编辑 URL、取消链接         |
| 图片       | 图片上下文条 — 对齐、预览、删除、缩放 |
| 视频       | 视频上下文条 — 播放预览、删除         |
| 表格单元格 | 表格上下文条 — 行列操作、合并拆分     |

## 块菜单

斜杠命令与拖拽手柄触发的 BlockPickerMenu（见 [块编辑](./block-editing.md)）。

## 移动端

视口 ≤768px 时顶栏自动回退 **COMPACT** 布局（ToolbarNav）。

## Session Loading

`sessionKey` 变化重建期间显示 skeleton 占位，避免 chrome 白屏闪烁。

## 相关

- [预览模式](../guide/preview-mode.md)
- [架构设计 — ChromePolicy](../contributing/architecture.md#chromepolicy)
