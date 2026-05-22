# 表格

由 `features.table` 控制。

## 启用

```vue
<YanivEditor preset="full" />
<YanivEditor preset="basic" :features="{ table: true }" />
<YanivEditor preset="full" :features="{ table: false }" />
```

关闭 `table` 后，表格扩展与所有表格编辑入口不可用；文档 JSON 中已有 table 节点在 rebuild 后可能**静默丢失**。

## 插入

- **full**：顶栏表格按钮 → 网格选择行列（可含表头）
- **notion**：空行 `/` → 表格块

## 编辑

光标在表格内时出现**表格上下文条**：

- 增删行 / 列
- 合并 / 拆分单元格
- 表头行 / 列切换
- 删除整张表

## 单元格

`TableCellWithBackground` 扩展支持单元格背景等 schema 属性；部分高级样式以 schema 为主，UI 覆盖有限。

## 相关

- [Office 粘贴](./office-paste.md) — 从 Excel 粘贴表格
- [Word 导入导出](./word-import-export.md)
