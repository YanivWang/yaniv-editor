import { getSchema, type Extensions, type JSONContent } from "@tiptap/core";
import { DOMParser, type Node as ProseMirrorNode, type Schema } from "@tiptap/pm/model";

import { BYPASS_GUARD_META } from "@/capabilities/transactionGuard";

import type { Editor } from "@tiptap/vue-3";

export interface SetContentOptions {
  addToHistory?: boolean;
  source?: "external" | "phase" | "session-rebuild";
}

const EMPTY_DOC_HTML = "<p></p>";

function htmlToElement(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
}

function emptyDocNode(schema: Schema): ProseMirrorNode {
  return schema.nodes.doc.create(null, [schema.nodes.paragraph.create()]);
}

function stripUnknownMarks(
  marks: JSONContent["marks"] | undefined,
  validMarks: Set<string>,
): JSONContent["marks"] | undefined {
  if (!marks?.length) return marks;
  const next = marks.filter((mark) => {
    const name = typeof mark === "string" ? mark : mark.type;
    return validMarks.has(name);
  });
  return next.length ? next : undefined;
}

function isInlineish(node: JSONContent, schema: Schema): boolean {
  if (node.type === "text") return true;
  if (!node.type) return true;
  const nodeType = schema.nodes[node.type];
  return !!nodeType?.isInline;
}

/** 将落到 block 上下文的 inline/text 收成 paragraph，避免非法 doc/block 内容 */
function coalesceInlines(nodes: JSONContent[], schema: Schema): JSONContent[] {
  const result: JSONContent[] = [];
  let inlineBuf: JSONContent[] = [];

  const flush = () => {
    if (!inlineBuf.length) return;
    result.push({ type: "paragraph", content: inlineBuf });
    inlineBuf = [];
  };

  for (const node of nodes) {
    if (isInlineish(node, schema)) {
      inlineBuf.push(node);
    } else {
      flush();
      result.push(node);
    }
  }
  flush();
  return result;
}

/**
 * 将单个节点适配到目标 schema。
 * 未知节点：提升其子节点（保留文本/合法后代），而不是改写成 paragraph
 *（避免 table → paragraph 包 tableRow 这类非法嵌套）。
 */
function adaptNode(
  node: JSONContent,
  schema: Schema,
  validNodes: Set<string>,
  validMarks: Set<string>,
): JSONContent[] {
  const adaptedChildren = (node.content ?? []).flatMap((child) =>
    adaptNode(child, schema, validNodes, validMarks),
  );

  const type = node.type;
  if (!type || !validNodes.has(type)) {
    return coalesceInlines(adaptedChildren, schema);
  }

  const adapted: JSONContent = { type };
  if (node.attrs !== undefined) adapted.attrs = node.attrs;
  if (node.text !== undefined) adapted.text = node.text;

  const marks = stripUnknownMarks(node.marks, validMarks);
  if (marks) adapted.marks = marks;

  if (type !== "text") {
    const nodeType = schema.nodes[type];
    const children =
      nodeType && !nodeType.inlineContent
        ? coalesceInlines(adaptedChildren, schema)
        : adaptedChildren;
    if (children.length) adapted.content = children;
  }

  return [adapted];
}

/**
 * 将 JSON 内容适配到目标 schema：剥离未知 mark；未知节点提升子内容。
 * 不修改入参。
 */
export function adaptJsonToSchema(content: JSONContent, schema: Schema): JSONContent {
  const validNodes = new Set(Object.keys(schema.nodes));
  const validMarks = new Set(Object.keys(schema.marks));
  const cloned = JSON.parse(JSON.stringify(content)) as JSONContent;

  if (cloned.type === "doc") {
    const children = coalesceInlines(
      (cloned.content ?? []).flatMap((child) => adaptNode(child, schema, validNodes, validMarks)),
      schema,
    );
    return {
      type: "doc",
      content: children.length ? children : [{ type: "paragraph" }],
    };
  }

  const lifted = coalesceInlines(adaptNode(cloned, schema, validNodes, validMarks), schema);
  return {
    type: "doc",
    content: lifted.length ? lifted : [{ type: "paragraph" }],
  };
}

/**
 * 将 HTML / JSON 解析为符合 schema 的 ProseMirror doc。
 * JSON 路径先 adaptJsonToSchema，避免 nodeFromJSON 抛 Unknown node type。
 */
export function parseContentToDoc(content: JSONContent | string, schema: Schema): ProseMirrorNode {
  try {
    if (typeof content === "string") {
      return DOMParser.fromSchema(schema).parse(htmlToElement(content || EMPTY_DOC_HTML));
    }
    return schema.nodeFromJSON(adaptJsonToSchema(content, schema));
  } catch {
    console.warn("[ContentAdapter] Failed to parse content, using empty doc");
    return emptyDocNode(schema);
  }
}

/**
 * 供 `new Editor({ content })` 使用：JSON 先按 extensions 推导的 schema 清洗；
 * HTML 原样返回（DOMParser 会静默丢弃未知标签）。
 */
export function prepareEditorContent(
  content: JSONContent | string,
  extensions: Extensions,
): JSONContent | string {
  if (typeof content === "string") return content || EMPTY_DOC_HTML;
  return adaptJsonToSchema(content, getSchema(extensions));
}

export const ContentAdapter = {
  adaptJsonToSchema,
  parseContentToDoc,
  prepareEditorContent,

  setContent(editor: Editor, content: JSONContent | string, options: SetContentOptions = {}): void {
    const view = editor.view;
    const doc = parseContentToDoc(content, view.state.schema);

    const tr = view.state.tr
      .setMeta(BYPASS_GUARD_META as unknown as string, true)
      .setMeta("addToHistory", options.addToHistory ?? false)
      .setMeta("yaniv:source", options.source ?? "external")
      .replaceWith(0, view.state.doc.content.size, doc.content);

    view.dispatch(tr);
  },

  setHtml(editor: Editor, html: string, options?: SetContentOptions): void {
    ContentAdapter.setContent(editor, html || EMPTY_DOC_HTML, options);
  },
};
