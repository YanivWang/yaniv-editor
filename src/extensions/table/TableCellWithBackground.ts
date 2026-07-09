/**
 * TableCellWithBackground — 带 schema 属性的表格单元格扩展
 * @description 基于 `@tiptap/extension-table` 的 `TableCell`，增加 `backgroundColor` / `textAlign`
 * 属性的 parseHTML / renderHTML。当前 TableToolbar 未提供设置这些属性的 UI；属性仍可从
 * HTML/JSON（如 Office 粘贴、外部文档）解析并写回 DOM。
 */
import { TableCell } from "@tiptap/extension-table";

/**
 * 自定义 TableCell：保留单元格背景色与水平对齐的 schema 往返能力。
 */
export const TableCellWithBackground = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-background-color") || element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            "data-background-color": attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      textAlign: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-text-align") || element.style.textAlign || null,
        renderHTML: (attributes) => {
          if (!attributes.textAlign) {
            return {};
          }
          return {
            "data-text-align": attributes.textAlign,
            style: `text-align: ${attributes.textAlign}`,
          };
        },
      },
    };
  },
});
