# Table

Controlled by `features.table`.

## Enable

```vue
<YanivEditor preset="full" />
<YanivEditor preset="basic" :features="{ table: true }" />
<YanivEditor preset="full" :features="{ table: false }" />
```

When `table` is disabled, table extensions and all table editing entry points are unavailable. On session rebuild, unknown `table` / `tableRow` / `tableCell` nodes in the JSON snapshot are handled by `ContentAdapter.adaptJsonToSchema`: **structure is stripped and children are lifted** (cell text is kept as paragraphs), rather than dropping the entire content.

## Insert

- **full**: header table button → grid picker for rows/columns (optional header row)
- **notion**: empty line `/` → table block

## Edit

When the cursor is inside a table, a **table context bar** (`TableToolbar`) appears:

- Add/remove rows and columns
- Merge / split cells
- Toggle header row / column
- Delete entire table

Column resize is provided by `Table.configure({ resizable: true })`.

## Cells

`TableCellWithBackground` adds schema attributes `backgroundColor` and `textAlign` (parsed from and rendered to HTML/JSON). The **current context bar has no UI** for setting background or alignment; these attributes mainly preserve paste/import round-trips.

## Related

- [Office Paste](./office-paste.md) — paste tables from Excel
- [Word Import and Export](./word-import-export.md)
