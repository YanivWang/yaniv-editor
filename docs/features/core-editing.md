# 核心编辑

Full Editor 的 **core** 层扩展在各 preset 下始终注册，不通过 `FeatureConfig` 开关。

## 文本与段落

- 粗体、斜体、下划线、删除线
- 标题 H1–H6
- 段落、引用（blockquote）、水平分割线
- 有序列表、无序列表、任务列表（可嵌套）
- 文本颜色与背景高亮（multicolor）
- 左 / 中 / 右 / 两端对齐

## 链接

- 顶栏或浮动菜单插入链接
- 选中链接后出现**链接气泡菜单**：编辑 URL、在新标签打开、取消链接

## 代码块

- 语法高亮：lowlight `common` 语言包（额外把 `xml` 注册了一个 `html` 别名）
- 语言选择器提供 20 种常用语言（`CODE_LANGUAGES`），默认 `javascript`
- full / notion：顶栏或 `/` 插入
- 代码块语言可在块角标（`CodeBlockLanguageBadge`）切换

## 字体与排版（full 顶栏）

- 字体族、字号下拉（`full` preset）
- 上标 / 下标（`full` preset）
- **行高**：无独立顶栏按钮，可通过格式刷复制或 HTML 保留

## 字符计数

底栏（basic / full）显示字符数、词数与页数；字符/词数由 CharacterCount 扩展提供，页数由 `useEditorPagination` 估算。底栏同时提供 50%–200%（步长 10）的缩放控制。

## Inline Editor

Inline 通过 `toolbar` 开关控制可用格式，默认仅 undo/redo + 文本格式 + 链接。详见 [Inline 工具栏](../guide/inline-toolbar.md)。
