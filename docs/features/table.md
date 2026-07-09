# 表格

由 `features.table` 控制。

## 启用

```vue
<YanivEditor preset="full" />
<YanivEditor preset="basic" :features="{ table: true }" />
<YanivEditor preset="full" :features="{ table: false }" />
```

关闭 `table` 后，表格扩展与所有表格编辑入口不可用。session rebuild 时，JSON 快照中的 `table` / `tableRow` / `tableCell` 等未知节点会经 `ContentAdapter.adaptJsonToSchema` **剥离结构并提升子内容**（单元格内文本保留为段落），而不是整段内容消失。

## 插入

- **full**：顶栏表格按钮 → 网格选择行列（可含表头）
- **notion**：空行 `/` → 表格块

## 编辑

光标在表格内时出现**表格上下文条**（`TableToolbar`）：

- 增删行 / 列
- 合并 / 拆分单元格
- 表头行 / 列切换
- 删除整张表

列宽拖拽由 `Table.configure({ resizable: true })` 提供。

## 单元格

`TableCellWithBackground` 在 schema 层支持 `backgroundColor`、`textAlign`（可从 HTML/JSON 解析并渲染）。**当前上下文条不提供**设置背景色或对齐的 UI；这些属性主要用于粘贴/导入内容的往返保留。

## 相关

- [Office 粘贴](./office-paste.md) — 从 Excel 粘贴表格
- [Word 导入导出](./word-import-export.md)
