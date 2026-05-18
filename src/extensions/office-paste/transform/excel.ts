import { DOMParser as ProseMirrorDOMParser } from "@tiptap/pm/model";

import type { EditorView } from "@tiptap/pm/view";

const parseCSS = (cssRules: string): Record<string, string> => {
  const results: Record<string, string> = {};
  const rules = cssRules
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean);
  rules.forEach((rule) => {
    const idx = rule.indexOf(":");
    if (idx <= 0) return;
    const property = rule.slice(0, idx).trim();
    const value = rule.slice(idx + 1).trim();
    if (property && value) results[property] = value;
  });
  return results;
};

const extractStyles = (styleText: string): Record<string, Record<string, string>> => {
  const styles: Record<string, Record<string, string>> = {};
  const regex = /\.(\w+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(styleText)) !== null) {
    const [, className, cssRules] = match;
    styles[className] = parseCSS(cssRules);
  }
  return styles;
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
    const cls = cell.getAttribute("class");
    const styleMap = cls ? styles[cls] : undefined;
    if (!styleMap) return;
    if (styleMap.background) cell.style.background = styleMap.background;
    if (styleMap.color) cell.style.color = styleMap.color;
    if (styleMap["text-align"]) cell.setAttribute("align", styleMap["text-align"]);
  });

  const { schema } = view.state;
  const parsed = ProseMirrorDOMParser.fromSchema(schema).parse(table);
  const tr = view.state.tr.replaceSelectionWith(parsed);
  view.dispatch(tr);

  event.preventDefault();
  event.stopPropagation();
  return true;
}
