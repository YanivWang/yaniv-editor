import type { Transaction } from "@tiptap/pm/state";

/**
 * AI 命令会通过 view.dispatch 自行提交事务；
 * 需阻止 Tiptap CommandManager 在命令结束后再次 dispatch 命令初始 tr（否则会 RangeError: mismatched transaction）。
 */
export function preventCommandAutoDispatch(tr: Transaction): void {
  tr.setMeta("preventDispatch", true);
}
