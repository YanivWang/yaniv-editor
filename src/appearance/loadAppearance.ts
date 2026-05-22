/**
 * 视觉外观：样式已打入 @yanivjs/yaniv-editor/style.css，运行时仅标记已就绪。
 */
import type { EditorAppearance } from "@/configs/editorConfig";

const LOADABLE_APPEARANCES = ["default", "word", "notion"] as const;
export type LoadableAppearance = (typeof LOADABLE_APPEARANCES)[number];

// 目前 CSS 由 style.css 一次性提供；保留就绪记录是为了维持异步 API 形态。
const loadedAppearances = new Set<LoadableAppearance>();

export function isLoadableAppearance(
  appearance: EditorAppearance,
): appearance is LoadableAppearance {
  return (LOADABLE_APPEARANCES as ReadonlyArray<string>).includes(appearance);
}

/** 标记外观已就绪（CSS 由 style.css 提供，无需动态 import） */
export async function loadAppearance(appearance: EditorAppearance): Promise<void> {
  if (!isLoadableAppearance(appearance) || loadedAppearances.has(appearance)) return;
  loadedAppearances.add(appearance);
}

/** 预加载多个外观 */
export async function preloadAppearances(appearances: EditorAppearance[]): Promise<void> {
  await Promise.all(appearances.map((item) => loadAppearance(item)));
}
