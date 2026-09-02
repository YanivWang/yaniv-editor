import { unwrapNode } from "../utils";

/**
 * 拆掉 Word 行号相关的包裹元素，保留其中的内容。
 *
 * 子串匹配是**有意的**（与 `transformMsoHtmlClasses` 的精确口径不同）：那边选择器与操作
 * 两套口径会白跑，这里操作是 unwrap 整个元素，收紧反而可能漏掉 `MsoLineNumber*` 变体。
 * 差异面与一条未验证的观察（Word 里它是字符样式，unwrap 可能把行号数字留进正文）
 * 见 `officePaste.test.ts`。
 */
export function transformRemoveLineNumberWrapper(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const lineNumbers = doc.querySelectorAll('[class*="MsoLineNumber"]');
  lineNumbers.forEach((node) => unwrapNode(node));

  return doc.documentElement.outerHTML;
}
