import type { TiptapLocale } from "./types";

/**
 * 按 dot-path 从语言包取文案 —— 全仓库唯一实现。
 *
 * 此前 `manager.ts`、`core/infra/useEditorLocale.ts` 与 `capabilities/registry.ts`（两处）
 * 各写了一份行为等价的走法，四份都作用在同一个 `TiptapLocale` 上
 * （`LocaleMessages` 就是它的别名），没有类型上的分家理由。
 *
 * 未命中返回 `undefined` 而不是回退成 key：兜底策略由调用方决定（`?? key`，
 * 或继续查下一份语言包）。用 key 当「未命中」哨兵会在译文恰好等于 key 时误判。
 *
 * 不导出到包入口（`locales/index.ts` 不 re-export），属仓库内部工具。
 */
export function resolveMessage(
  messages: TiptapLocale | null | undefined,
  key: string,
): string | undefined {
  if (!messages) return undefined;

  let cur: unknown = messages;
  for (const part of key.split(".")) {
    if (!cur || typeof cur !== "object" || !(part in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }

  return typeof cur === "string" ? cur : undefined;
}

/**
 * 把 `{name}` 占位符替换成实际值 —— 全仓库唯一实现。
 *
 * 全局 `t()` 与实例级 `useEditorT()` 曾经分家：前者支持 params，后者只接 key，
 * 于是带占位符的文案（`editor.galleryCount`、`editor.translateTo`）只能在各自的
 * 调用点手写 `.replace("{total}", ...)`。漏写一处，用户就会直接看到 `{total}`。
 *
 * 单趟替换（不是逐个 param 重复 replace）：参数值里若恰好含 `{x}` 不会被后续
 * 参数二次替换，避免用户数据（文件名等）意外注入占位符。
 * 未提供对应参数的占位符原样保留，便于在界面上暴露漏传。
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}
