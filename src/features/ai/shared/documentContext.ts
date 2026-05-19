import { AI_PROMPTS } from "../prompts";

import type { Editor } from "@tiptap/core";

/** 将当前文档全文组装为 AI 上下文提示 */
export function buildDocumentContextPrompt(editor: Editor): string {
  const fullText = editor.state.doc.textBetween(0, editor.state.doc.content.size, " ");
  return AI_PROMPTS.documentContext(fullText);
}
