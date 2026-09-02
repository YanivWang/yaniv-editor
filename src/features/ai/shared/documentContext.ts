import { AI_PROMPTS } from "../prompts";

import type { Editor } from "@tiptap/core";

/**
 * 文档上下文默认字符上限。
 *
 * 全文会原样拼进 system prompt，不限长的话超长文档会直接把请求撑爆
 * （多数模型返回 400）。这里的单位是**字符**而不是 token：项目同时支持
 * openai / aliyun / ollama 且模型可配，各家的 tokenizer 不同，没有统一的换算。
 * 8000 字符对中文约合 8000~12000 token，对 8k 上下文的模型已偏大——
 * 宿主应按自己实际用的模型调 `aiConfig.documentContextLimit`。
 */
export const DEFAULT_DOCUMENT_CONTEXT_LIMIT = 8000;

/** 截断标记，拼在被截断的正文后面，让模型知道自己拿到的不是全文 */
const TRUNCATION_MARKER = "\n\n……（文档过长，以上为节选）";

export interface DocumentContext {
  /** 可直接作为 system prompt 的完整文本 */
  prompt: string;
  /** 是否发生了截断 */
  truncated: boolean;
  /** 实际送进 prompt 的字符数 */
  keptChars: number;
  /** 文档全文字符数 */
  totalChars: number;
}

/**
 * 取当前文档全文，按上限截断后组装为 AI 上下文提示。
 *
 * 截断保留**开头**：文档开头通常最能说明主题与体裁，而调用方另外会把
 * 用户选中的那段单独作为 user content 传过去，光标附近的内容不会因此丢失。
 * 截断**不静默**——调用方拿到 `truncated` 后必须给用户一次明确提示，
 * 否则用户只会觉得「AI 这次答得不太行」，却不知道模型根本没看到全文。
 */
export function buildDocumentContext(editor: Editor, limit?: number): DocumentContext {
  const fullText = editor.state.doc.textBetween(0, editor.state.doc.content.size, " ");
  const totalChars = fullText.length;

  const max = limit ?? DEFAULT_DOCUMENT_CONTEXT_LIMIT;
  // 非正数视为「不限长」：宿主明确要关掉这个保护时得有办法
  if (!Number.isFinite(max) || max <= 0 || totalChars <= max) {
    return {
      prompt: AI_PROMPTS.documentContext(fullText),
      truncated: false,
      keptChars: totalChars,
      totalChars,
    };
  }

  const kept = fullText.slice(0, max);
  return {
    prompt: AI_PROMPTS.documentContext(kept + TRUNCATION_MARKER),
    truncated: true,
    keptChars: max,
    totalChars,
  };
}

/**
 * 将当前文档内容组装为 AI 上下文提示。
 *
 * 需要知道有没有被截断时用 {@link buildDocumentContext}——这个薄封装只为兼容既有调用方。
 */
export function buildDocumentContextPrompt(editor: Editor, limit?: number): string {
  return buildDocumentContext(editor, limit).prompt;
}
