# Table

Controlled by `features.table`.

## Enable

```vue
<YanivEditor preset="full" />
<YanivEditor preset="basic" :features="{ table: true }" />
<YanivEditor preset="full" :features="{ table: false }" />
```

When `table` is disabled, table extensions and all table editing entry points are unavailable; existing table nodes in document JSON may be **silently lost** after rebuild.

## Insert

- **full**: header table button → grid picker for rows/columns (optional header row)
- **notion**: empty line `/` → table block

## Edit

When the cursor is inside a table, a **table context bar** appears:

- Add/remove rows and columns
- Merge / split cells
- Toggle header row / column
- Delete entire table

## Cells

The `TableCellWithBackground` extension supports cell background and other schema attributes; some advanced styles are schema-first with limited UI coverage.

## Related

- [Office Paste](./office-paste.md) — paste tables from Excel
- [Word Import and Export](./word-import-export.md)
