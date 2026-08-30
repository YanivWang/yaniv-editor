import { Plugin } from "@tiptap/pm/state";

import { normalizeSafeMediaUrl } from "@/utils/safeUrl";

import type { JSONContent } from "@tiptap/core";

/**
 * 媒体 src 白名单的**统一落点**。
 *
 * 背景：节点的 `parseHTML` / `renderHTML` 只覆盖 **DOM 边界**——
 * 从 HTML 解析进来、渲染成 DOM 出去。但 src 还有两条路径根本不经过 DOM：
 *
 * | 入口                              | parseHTML | renderHTML | 修复前 attrs |
 * | --------------------------------- | :-------: | :--------: | ------------ |
 * | HTML 字符串 / 粘贴                |     ✅     |     ✅      | 已清洗       |
 * | JSON `initialContent` / setContent|     ❌     |     ✅      | **原样保留** |
 * | `setImage()` / `setVideo()` / 命令|     ❌     |     ✅      | **原样保留** |
 *
 * `renderHTML` 会把**输出**洗干净，所以编辑器自身渲染的 DOM 是安全的；但危险值仍然进了
 * 文档 attrs，`getJSON()`（公开 API）会原样交给宿主——宿主若持久化 JSON 再自行渲染
 * `attrs.src`，白名单就等于没有。
 *
 * 因此这里补齐另外两条入口：
 * - JSON：`adaptJsonToSchema`（所有 JSON 内容的唯一漏斗）逐节点调 {@link sanitizeMediaSrcAttrs}
 * - 命令 / 任意事务：{@link createMediaSrcGuardPlugin} 的 `appendTransaction`
 *
 * 对应 CONTRIBUTING「URL 一律过白名单，不要新增绕过路径」与 ARCHITECTURE 不变量 17。
 */
export const MEDIA_SRC_NODES = {
  image: "image",
  video: "video",
} as const satisfies Record<string, "image" | "video">;

export type MediaSrcNodeName = keyof typeof MEDIA_SRC_NODES;

export function isMediaSrcNode(type: string | undefined | null): type is MediaSrcNodeName {
  return !!type && Object.prototype.hasOwnProperty.call(MEDIA_SRC_NODES, type);
}

/**
 * 归一化一份 JSON 节点的 `attrs.src`；不合格置为 `null`（与 `parseHTML` 侧一致）。
 *
 * 非媒体节点、或 src 本就合格时返回**原对象**，避免无谓的拷贝。
 */
export function sanitizeMediaSrcAttrs(
  type: string | undefined,
  attrs: JSONContent["attrs"],
): JSONContent["attrs"] {
  if (!isMediaSrcNode(type) || !attrs) return attrs;

  const raw = attrs.src;
  if (raw == null || raw === "") return attrs;

  const safe = normalizeSafeMediaUrl(String(raw), MEDIA_SRC_NODES[type]);
  if (safe === raw) return attrs;

  return { ...attrs, src: safe };
}

/**
 * 事务级兜底：任何把危险 src 写进文档的事务（`setImage()` / `setVideo()` /
 * `insertContent()` / 宿主自定义命令）都会被紧接着的一个补偿事务改回 `null`。
 *
 * 只在文档真的变化时遍历，且遍历只看本节点类型——与 `yanivPlaceholder` 的
 * 全文档遍历同量级。补偿事务标记 `addToHistory: false`，避免用户按一次撤销
 * 只是把危险值撤回来。
 */
export function createMediaSrcGuardPlugin(nodeName: MediaSrcNodeName): Plugin {
  const kind = MEDIA_SRC_NODES[nodeName];

  return new Plugin({
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;

      let tr = null;
      newState.doc.descendants((node, pos) => {
        if (node.type.name !== nodeName) return;

        const raw = node.attrs.src;
        if (raw == null || raw === "") return;

        const safe = normalizeSafeMediaUrl(String(raw), kind);
        if (safe === raw) return;

        tr ??= newState.tr.setMeta("addToHistory", false);
        tr.setNodeAttribute(pos, "src", safe);
      });

      return tr;
    },
  });
}
