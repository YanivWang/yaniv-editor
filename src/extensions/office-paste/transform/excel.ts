import { DOMParser as ProseMirrorDOMParser } from "@tiptap/pm/model";

import { parseCssDeclarations } from "../utils";

import type { EditorView } from "@tiptap/pm/view";

const extractStyles = (styleText: string): Record<string, Record<string, string>> => {
  const styles: Record<string, Record<string, string>> = {};
  const regex = /\.(\w+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(styleText)) !== null) {
    const [, className, cssRules] = match;
    styles[className] = parseCssDeclarations(cssRules);
  }
  return styles;
};

/**
 * 合并单元格上**所有**类名的声明，后写的类覆盖先写的（同特异性下 CSS 的后来居上）。
 *
 * 此前是 `styles[cell.getAttribute("class")]` —— 拿整个 class 属性当表键，
 * 于是 `class="xl65 xl66"` 查不到任何条目，两个类的样式一起丢。
 */
const resolveCellStyles = (
  cell: HTMLElement,
  styles: Record<string, Record<string, string>>,
): Record<string, string> => {
  const merged: Record<string, string> = {};
  for (const cls of Array.from(cell.classList)) {
    Object.assign(merged, styles[cls]);
  }
  return merged;
};

/** 把单元格已有内容裹进 `<span style="color:…">`，让 Color mark 能解析到字体色 */
const wrapCellTextInColor = (cell: HTMLElement, color: string): void => {
  if (!cell.firstChild) return;
  const span = cell.ownerDocument.createElement("span");
  span.style.color = color;
  // CSSOM 不认的值（Excel 偶尔输出 Word 私有关键字）解析后为空，包了也没用，不如不包
  if (!span.style.color) return;
  while (cell.firstChild) span.appendChild(cell.firstChild);
  cell.appendChild(span);
};

/** Excel 复制的表格：结构化插入表格节点 */
export function transformExcelPaste(view: EditorView, event: ClipboardEvent): boolean {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return false;

  const html = clipboardData.getData("text/html");
  if (!html) return false;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const xmlnsAttr = doc.documentElement.getAttribute("xmlns:x") || "";
  const excel = xmlnsAttr.includes("office:excel");
  if (!excel) return false;

  const table = doc.querySelector("table");
  if (!table) return false;

  const styleText = Array.from(doc.head.querySelectorAll("style"))
    .map((style) => style.textContent || "")
    .join("\n");

  const styles = extractStyles(styleText);

  table.querySelectorAll("td, th").forEach((cell) => {
    if (!(cell instanceof HTMLElement)) return;
    const styleMap = resolveCellStyles(cell, styles);
    if (styleMap.background) cell.style.background = styleMap.background;
    if (styleMap["text-align"]) cell.setAttribute("align", styleMap["text-align"]);
    // 字体色必须落在单元格**内容**上：tableCell 的 schema 只认 backgroundColor /
    // textAlign / align，写在 <td> 上的 color 会被 ProseMirror 直接丢掉。
    // Color mark 的 parseHTML 认的是 <span style="color:…">，所以包一层。
    if (styleMap.color) wrapCellTextInColor(cell, styleMap.color);
  });

  const { schema } = view.state;
  const parsed = ProseMirrorDOMParser.fromSchema(schema).parse(table);
  const tr = view.state.tr.replaceSelectionWith(parsed);
  view.dispatch(tr);

  event.preventDefault();
  event.stopPropagation();
  return true;
}
