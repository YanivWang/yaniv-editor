import { unwrapNode } from "../utils";

export function transformRemoveLineNumberWrapper(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const lineNumbers = doc.querySelectorAll('[class*="MsoLineNumber"]');
  lineNumbers.forEach((node) => unwrapNode(node));

  return doc.documentElement.outerHTML;
}
