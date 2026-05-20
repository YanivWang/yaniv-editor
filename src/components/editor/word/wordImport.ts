/**
 * Word 导入工具
 * @description 使用 mammoth 将 .docx 文件转换为 HTML 并插入编辑器
 */
import mammoth from "mammoth";

import { normalizeSafeUrl } from "@/utils/safeUrl";

import type { Editor } from "@tiptap/core";

export interface WordImportResult {
  html: string;
  messages: string[];
}

/**
 * 将 Word 文件转换为 HTML
 * @param file - .docx 文件
 * @returns 转换结果（HTML + 消息）
 */
export async function convertWordToHtml(file: File): Promise<WordImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
      ],
    },
  );

  return {
    html: sanitizeImportedHtml(result.value),
    messages: result.messages.map((m) => m.message),
  };
}

function sanitizeImportedHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("a[href]").forEach((link) => {
    const safeHref = normalizeSafeUrl(link.getAttribute("href") ?? "");
    if (!safeHref) {
      link.removeAttribute("href");
      return;
    }

    link.setAttribute("href", safeHref);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });

  return doc.body.innerHTML;
}

/**
 * 导入 Word 文件到编辑器
 * @param editor - Tiptap 编辑器实例
 * @param file - .docx 文件
 */
export async function importWordFile(editor: Editor, file: File): Promise<WordImportResult> {
  const result = await convertWordToHtml(file);

  if (result.html) {
    editor.chain().focus().setContent(result.html).run();
  }

  return result;
}
