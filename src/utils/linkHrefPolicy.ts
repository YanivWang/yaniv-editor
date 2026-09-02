import { Plugin } from "@tiptap/pm/state";

import { normalizeSafeUrl } from "@/utils/safeUrl";

import type { JSONContent } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";

/**
 * 链接 href 白名单的**统一落点** —— 与 `mediaSrcPolicy` 同构，理由完全一致。
 *
 * `createLinkExtension()` 的 `isAllowedUri` 只覆盖 **DOM 边界与命令**：
 *
 * | 入口                               | isAllowedUri | 修复前 attrs |
 * | ---------------------------------- | :----------: | ------------ |
 * | HTML 字符串 / 粘贴 / 自动链接      |      ✅       | 已拦截（整个 mark 被丢弃） |
 * | `setLink()` 命令                   |      ✅       | 已拦截       |
 * | JSON `initialContent` / setContent |      ❌       | **原样保留** |
 *
 * 危险 href 经 JSON 进入文档后，`renderHTML` 侧 TipTap 会把输出洗成 `href=""`，
 * 所以 `getHTML()` 完全看不出异常——但值已经在文档 attrs 里，`getJSON()`（公开 API）
 * 会把 `javascript:alert(1)` 原样交给宿主，宿主持久化后自行渲染即中招。
 * 编辑器自身也会中招：链接气泡的「打开链接」读的就是 `attrs.href`。
 *
 * 因此补齐另外两条入口：
 * - JSON：`adaptJsonToSchema` 逐节点调 {@link sanitizeLinkHrefMarks}
 * - 任意事务：{@link createLinkHrefGuardPlugin} 的 `appendTransaction`
 *
 * 处置方式与 HTML 路径保持一致：**丢掉整个 link mark，保留文字**，
 * 而不是把 href 改写成空串（后者会留下一个点不动的空链接）。
 * href 合法时原样保留，不做归一化改写——HTML 路径也不改写（`example.com` 不会被补成
 * `https://example.com/`），两条路径必须给出同样的结果。
 *
 * 对应 CONTRIBUTING「URL 一律过白名单」与 ARCHITECTURE 不变量 17。
 */
export const LINK_MARK_NAME = "link";

/**
 * href 是否可进入文档。
 *
 * 空值放行（无 href 的 link mark 本身无害）；非字符串一律拒收——JSON 是宿主给的，
 * `href: { toString() {...} }` 这类值不该被强转后再判定。
 */
export function isSafeLinkHref(raw: unknown): boolean {
  if (raw == null || raw === "") return true;
  if (typeof raw !== "string") return false;
  return normalizeSafeUrl(raw) !== null;
}

/**
 * 丢弃 href 不合格的 link mark；其余 mark 原样保留。
 * 没有需要丢弃的内容时返回**原数组**，避免无谓拷贝。
 */
export function sanitizeLinkHrefMarks(
  marks: JSONContent["marks"] | undefined,
): JSONContent["marks"] | undefined {
  if (!marks?.length) return marks;

  const next = marks.filter((mark) => {
    if (typeof mark === "string" || mark.type !== LINK_MARK_NAME) return true;
    return isSafeLinkHref(mark.attrs?.href);
  });

  if (next.length === marks.length) return marks;
  return next.length ? next : undefined;
}

/**
 * 事务级兜底：任何把危险 href 写进文档的事务（宿主自定义命令、`insertContent()`、
 * 直接 dispatch 的事务）都会被紧接着的补偿事务摘掉该 mark。
 *
 * 只在文档真的变化时遍历。补偿事务标记 `addToHistory: false`，
 * 避免用户按一次撤销把危险值撤回来。
 */
export function createLinkHrefGuardPlugin(markType: MarkType): Plugin {
  return new Plugin({
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;

      let tr = null;
      newState.doc.descendants((node, pos) => {
        const unsafe = node.marks.find(
          (mark) => mark.type === markType && !isSafeLinkHref(mark.attrs.href),
        );
        if (!unsafe) return;

        tr ??= newState.tr.setMeta("addToHistory", false);
        tr.removeMark(pos, pos + node.nodeSize, markType);
      });

      return tr;
    },
  });
}
