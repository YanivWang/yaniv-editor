# 表格

## 基础能力

- 插入表格（工具栏 `TableButton`）
- 列宽可拖拽调整（`Table.configure({ resizable: true })`）
- 合并/拆分单元格、增删行列（通过表格工具栏）
- 表头行支持（`TableHeader`）

扩展门控：`features.table !== false`（默认开启）

## 表格工具栏

选中表格或单元格时显示上下文工具栏 `TableToolbar`。

```vue
<TiptapProEditor
  :features="{
    table: true,
    tableToolbar: true,
  }"
  :table-menu-show-mode="2"
/>
```

### tableMenuShowMode

| 值  | 行为                       |
| --- | -------------------------- |
| `1` | 表格获得焦点时显示         |
| `2` | 单元格被选中时显示（默认） |

## 从 Excel 粘贴

启用 `officePaste`（默认 true）时，从 Excel 复制的表格可粘贴为 HTML 表格结构。

关闭 Excel 表格粘贴（宿主传入）：

```ts
getExtensionsByVersion("advanced", {
  officePaste: {
    excelTablePaste: false,
  },
});
```

## 斜杠命令插入

开启 `features.slashCommand: true` 后，输入 `/` 可选择「表格」快速插入。

## 关闭表格

```vue
<TiptapProEditor :features="{ table: false, tableToolbar: false }" />
```

扩展与工具栏按钮将同步隐藏（通过 `applyExtensionGatesToToolbarConfig`）。

## 下一步

- [功能配置](/api/features-config)
- [Word 导入导出](/features/word-import-export) — Word 表格互转
