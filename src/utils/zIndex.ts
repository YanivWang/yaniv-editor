/**
 * 读取 --ye-z-* design token（唯一定义于 variables.css）。
 * Tippy 等需要数值型 z-index 的 API 通过此函数与 CSS 保持同一层级源。
 */

export type YeZIndexToken =
  | "--ye-z-chrome"
  | "--ye-z-tooltip"
  | "--ye-z-overlay-backdrop"
  | "--ye-z-bubble-menu"
  | "--ye-z-floating-menu"
  | "--ye-z-picker-menu"
  | "--ye-z-drag-menu"
  | "--ye-z-dropdown"
  | "--ye-z-modal";

/** 从 :root 读取 z-index token。token 未加载或无效时抛出错误。 */
export function getYeZIndex(token: YeZIndexToken): number {
  if (typeof document === "undefined") {
    throw new Error(`getYeZIndex("${token}") requires a DOM environment`);
  }

  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Missing or invalid z-index token: ${token}`);
  }

  return parsed;
}
