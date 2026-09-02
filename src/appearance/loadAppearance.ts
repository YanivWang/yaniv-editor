/**
 * 视觉外观：样式已打入 @yanivjs/yaniv-editor/style.css，运行时无需做任何加载。
 */
import type { EditorAppearance } from "@/configs/editorConfig";

/**
 * 有对应 CSS 文件的外观（`custom` 不在其中，它靠 customAppearanceVars 内联注入）。
 *
 * 这是唯一定义，`EDITOR_APPEARANCES` 是它的公开别名 —— 此前两处各写一份，
 * 值相同、顺序还不一样，改一处漏一处只是时间问题。
 */
export const LOADABLE_APPEARANCES = ["default", "notion", "word"] as const;
export type LoadableAppearance = (typeof LOADABLE_APPEARANCES)[number];

export function isLoadableAppearance(
  appearance: EditorAppearance,
): appearance is LoadableAppearance {
  return (LOADABLE_APPEARANCES as ReadonlyArray<string>).includes(appearance);
}

/**
 * 标记外观已就绪。
 *
 * 内置外观的 CSS 由 `style.css` 一次性提供，这里**没有任何事可做**；
 * 保留 async 签名是为了维持公开 API 形态（宿主可能 `await` 它）。
 * 此前还留了一个模块级 `Set` 记录「已就绪」，但没有任何消费方 ——
 * 写进去的状态只被自己的早退判断读一次，而早退与否结果都一样是空操作；
 * 它同时违反了「禁止模块级可变状态」（多实例共享同一份记录）。
 */
export async function loadAppearance(_appearance: EditorAppearance): Promise<void> {
  // no-op：见上方说明
}

/** 预加载多个外观（同样是空操作，保留以维持 API 形态） */
export async function preloadAppearances(appearances: EditorAppearance[]): Promise<void> {
  await Promise.all(appearances.map((item) => loadAppearance(item)));
}
