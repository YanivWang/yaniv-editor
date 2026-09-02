import { TAG_INNARDS } from "@/utils/htmlTagPattern";

import { parseStyleAttribute } from "../utils";

/**
 * Office 的段落标记 `<o:p>`：内容恒为空或 `&nbsp;`，整块丢弃。
 *
 * 需要覆盖带属性（`<o:p style=...>`）、跨行、以及自闭合（`<o:p/>`）三种形态 ——
 * 原先的 `/<o:p>(.*?)<\/o:p>/` 三种都漏（`.` 还不匹配换行）。
 */
const O_P_BLOCK = new RegExp(
  `<o:p\\b${TAG_INNARDS}>[\\s\\S]*?</o:p>|<o:p\\b${TAG_INNARDS}/>`,
  "gi",
);

/**
 * Word 会把正文的默认黑色显式写进 style（`color:black` / `color:#000000`）。
 * 粘进编辑器后这层写死的黑在深色模式下就是黑底黑字，所以要抹掉、让文字回到主题色。
 *
 * 判定必须走 CSSOM 而不是匹配 style 属性的子串：`color:black`（Word 原样输出，无空格）
 * 与 `color: black`（本文件上一步重写后带空格）是同一件事，
 * 而 `background-color: black` 恰好包含 `color: black` 子串却不该被动。
 * 交给浏览器归一化，`black` / `#000` / `#000000` / `rgb(0,0,0)` 一并收敛成 `rgb(0, 0, 0)`。
 */
const BLACK_COLORS = new Set(["rgb(0, 0, 0)", "rgba(0, 0, 0, 1)", "#000000", "black"]);

function isBlack(color: string): boolean {
  return BLACK_COLORS.has(color.trim().toLowerCase());
}

export function transformMsoStyles(html: string): string {
  html = html.replace(O_P_BLOCK, "");

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll('[style*="mso-"]').forEach((node) => {
    const styles = parseStyleAttribute(node);
    const newStyles: string[] = [];
    for (const prop of Object.keys(styles)) {
      if (prop && !prop.startsWith("mso-")) newStyles.push(`${prop}: ${styles[prop]}`);
    }
    node.setAttribute("style", newStyles.join(";"));
  });

  doc.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    if (isBlack(el.style.color)) el.style.removeProperty("color");
  });

  return doc.documentElement.outerHTML;
}
