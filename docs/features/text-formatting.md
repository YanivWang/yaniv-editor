# 文本与排版

## 工具栏入口

在 `version="advanced"` 且 `headerNav: true` 时，文本相关工具分布在工具栏各分区：

| 分区 | 工具                                  |
| ---- | ------------------------------------- |
| 文档 | 撤销/重做、格式刷、查找替换、清除格式 |
| 字体 | 字体族、字号、粗斜体等、文字/背景色   |
| 段落 | 标题、列表、对齐、行距                |

## 支持的格式

### 块级

- 段落
- 标题 H1–H6
- 有序列表、无序列表、任务列表（可嵌套）
- 引用块
- 代码块
- 水平分隔线

### 行内

- **粗体**、_斜体_、<u>下划线</u>、~~删除线~~
- 行内代码
- 文字颜色、背景高亮（多色）
- 上标、下标
- 超链接

### 段落样式

- 左 / 中 / 右 / 两端对齐
- 字体族、字号
- 行距（LineHeight 扩展）

## 格式刷

格式刷复制当前选区格式并应用到下一选区。

- 扩展：`FormatPainter`
- 门控：`features.formatPainter`（advanced 默认开启）
- 可通过 `undoRedoDisabled` / `formatPainterDisabled` 禁用工具栏按钮

## 查找与替换

- 快捷键：`Ctrl/Cmd + F`（通过 `useFindReplaceHotkey`）
- 扩展：`SearchReplace`
- 门控：`features.searchReplace`（advanced 默认开启）
- 工具栏：`FindReplaceButton`（`searchReplace` 配置项）

## 斜杠命令

输入 `/` 可快速插入块类型（需 `features.slashCommand: true`）：

- 段落、标题
- 有序/无序/任务列表
- 分隔线、代码块、表格
- 图片

## Office 粘贴

`OfficePaste` 扩展增强从 Word、WPS、Excel 粘贴时的结构保真：

- 列表、MSO 样式清理
- Excel 表格转 HTML 表格
- 含图片的 Office 粘贴会提示（图片需单独处理）

关闭：`features.officePaste: false`

## 大纲与锚点

advanced 默认注册：

- `UniqueID` — 为标题生成唯一 ID
- `TableOfContents` — 目录数据（供扩展 UI 使用）

关闭：`features.outline: false`

## 字符统计

`CharacterCount` 扩展始终注册。在 `footerNav: true` 时，底部状态栏显示字数。

## 相关 API

- [功能配置 — searchReplace / formatPainter / outline](/api/features-config)
- [Composables — useFindReplaceHotkey](/api/composables)
