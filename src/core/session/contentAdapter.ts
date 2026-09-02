import { getSchema, type Extensions, type JSONContent } from "@tiptap/core";
import { DOMParser, type Node as ProseMirrorNode, type Schema } from "@tiptap/pm/model";
import { EditorState, type Plugin, type Transaction } from "@tiptap/pm/state";

import { BYPASS_GUARD_META } from "@/capabilities/transactionGuard";
import { sanitizeLinkHrefMarks } from "@/utils/linkHrefPolicy";
import { sanitizeMediaSrcAttrs } from "@/utils/mediaSrcPolicy";

import type { Editor } from "@tiptap/vue-3";

export interface SetContentOptions {
  addToHistory?: boolean;
  source?: "external" | "phase" | "session-rebuild";
  /**
   * 是否连同撤销历史一起清空，默认 `true`。
   *
   * `setContent` 换掉的是**整份文档**，此前那些历史步骤指向的是另一份内容，
   * 撤销回去没有意义——prosemirror-history 也确实做不到：整文档替换会把已有步骤
   * 全部 rebase 成空，撤销时文档一动不动。但它的事件计数还在，于是
   * `can().undo()` 仍返回 `true`，撤销按钮亮着、点一次没有任何反应、再看才变灰。
   * 清空历史把这个「假的可撤销」变成诚实的不可撤销。
   */
  resetHistory?: boolean;
}

const EMPTY_DOC_HTML = "<p></p>";

/**
 * prosemirror-history 的插件 key 名（`new PluginKey("history")` → `"history$"`）。
 * `@tiptap/pm/history` 没有导出 `historyKey`，只能按名字从 `state.plugins` 里认。
 * 认不出来就当作「宿主关掉了撤销能力」，静默跳过。
 */
const HISTORY_PLUGIN_KEY_PREFIX = "history$";

function findHistoryPlugin(state: EditorState): Plugin | null {
  return (
    state.plugins.find((plugin) => {
      const key = (plugin.spec.key as { key?: string } | undefined)?.key;
      return typeof key === "string" && key.startsWith(HISTORY_PLUGIN_KEY_PREFIX);
    }) ?? null
  );
}

/**
 * 把一份干净的撤销历史挂到事务上。
 *
 * prosemirror-history 的 `apply` 第一件事就是 `tr.getMeta(historyKey)`——带了就直接
 * 采用其中的 `historyState`，这是它给自己的 undo/redo 命令留的入口，也是唯一不碰
 * 内部类就能重置历史的办法。干净的 `HistoryState` 从一个**只装了 history 插件**的
 * 临时 `EditorState` 里取：`EditorState.create` 会重新 init 插件，拿到的正是初始态。
 * 只放这一个插件是为了不触发其他插件 init 的副作用。
 */
function attachHistoryReset(state: EditorState, tr: Transaction): void {
  const plugin = findHistoryPlugin(state);
  const key = plugin?.spec.key;
  if (!plugin || !key) return;
  const fresh = EditorState.create({ schema: state.schema, plugins: [plugin] });
  tr.setMeta(key, { historyState: plugin.getState(fresh) });
}

/**
 * 用惰性文档（inert document）解析 HTML 字符串。
 *
 * 不能用 `document.createElement("div").innerHTML = html`：那样建出的节点属于**当前活动
 * 文档**，`<img src=x onerror=...>` / `<svg onload=...>` 的事件处理器会立即执行，外链资源
 * 也会真实发起请求。Inline Editor 的 `v-model:content` 直接接收宿主传入的 HTML 字符串
 * （评论 / 表单等 UGC 场景），该路径因此构成存储型 XSS 面。
 *
 * `DOMParser.parseFromString(..., "text/html")` 产出的文档没有 browsing context
 * （`ownerDocument.defaultView === null`）：脚本不执行、事件处理器不触发、资源不加载。
 * 与 Tiptap 官方 `elementFromString` 的实现保持一致。
 */
function htmlToElement(html: string): HTMLElement {
  return new window.DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
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
  // JSON 不经过 parseHTML，媒体 src 的白名单必须在这里补上（见 mediaSrcPolicy 文件头）
  if (node.attrs !== undefined) adapted.attrs = sanitizeMediaSrcAttrs(type, node.attrs);
  if (node.text !== undefined) adapted.text = node.text;

  // 同理，link 的 href 白名单也只在 DOM 边界与命令上生效，JSON 这条要在这里补
  const marks = sanitizeLinkHrefMarks(stripUnknownMarks(node.marks, validMarks));
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
      .setMeta(BYPASS_GUARD_META, true)
      .setMeta("addToHistory", options.addToHistory ?? false)
      .setMeta("yaniv:source", options.source ?? "external")
      .replaceWith(0, view.state.doc.content.size, doc.content);

    if (options.resetHistory ?? true) attachHistoryReset(view.state, tr);

    view.dispatch(tr);
  },

  setHtml(editor: Editor, html: string, options?: SetContentOptions): void {
    ContentAdapter.setContent(editor, html || EMPTY_DOC_HTML, options);
  },
};
