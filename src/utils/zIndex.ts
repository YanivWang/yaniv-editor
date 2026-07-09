/**
 * 读取 --ye-z-* design token（唯一定义于 variables.css，作用域为 .yaniv-editor）。
 *
 * CSS 使用 calc(var(--ye-z-base) + N)；浏览器可解析 calc 时以探针为准。
 * jsdom 等环境无法解析 calc 时，用 YE_Z_BASE_OFFSETS 回退（须与 variables.css 同步）。
 */

/** 宿主可覆盖的浮层 z-index 基准 CSS 变量 */
export const YE_Z_BASE_VAR = "--ye-z-base";

/** 浮层 z-index 默认基准（与 variables.css 中 .yaniv-editor 定义一致） */
export const YE_Z_INDEX_DEFAULT_BASE = 1000;

/** portal 内浮层 token（均基于 --ye-z-base） */
export type YeZIndexToken =
  | "--ye-z-overlay-backdrop"
  | "--ye-z-bubble-menu"
  | "--ye-z-floating-menu"
  | "--ye-z-picker-menu"
  | "--ye-z-drag-menu"
  | "--ye-z-drag-submenu"
  | "--ye-z-dropdown"
  | "--ye-z-tooltip"
  | "--ye-z-toast"
  | "--ye-z-modal";

/** 与 variables.css 中 calc(var(--ye-z-base) + N) 保持同步（仅作 calc 不可解析时的回退） */
export const YE_Z_BASE_OFFSETS: Record<YeZIndexToken, number> = {
  "--ye-z-overlay-backdrop": 0,
  "--ye-z-bubble-menu": 10,
  "--ye-z-floating-menu": 20,
  "--ye-z-picker-menu": 30,
  "--ye-z-drag-menu": 40,
  "--ye-z-drag-submenu": 41,
  "--ye-z-dropdown": 50,
  "--ye-z-tooltip": 60,
  "--ye-z-toast": 80,
  "--ye-z-modal": 100,
};

function readYeZBase(root: HTMLElement): number {
  const raw = getComputedStyle(root).getPropertyValue(YE_Z_BASE_VAR).trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : YE_Z_INDEX_DEFAULT_BASE;
}

/** 从编辑器根节点读取 z-index token。支持纯数值与 calc(var(...)+N) 等表达式。 */
export function getYeZIndex(token: YeZIndexToken, root: HTMLElement): number {
  if (typeof document === "undefined") {
    throw new Error(`getYeZIndex("${token}") requires a DOM environment`);
  }

  const raw = getComputedStyle(root).getPropertyValue(token).trim();
  const direct = Number.parseInt(raw, 10);
  if (Number.isFinite(direct) && /^\d+$/.test(raw)) {
    return direct;
  }

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;z-index:var(" + token + ")";
  root.appendChild(probe);

  try {
    const resolved = Number.parseInt(getComputedStyle(probe).zIndex, 10);
    if (Number.isFinite(resolved)) {
      return resolved;
    }
  } finally {
    root.removeChild(probe);
  }

  const offset = YE_Z_BASE_OFFSETS[token];
  if (raw && offset !== undefined) {
    return readYeZBase(root) + offset;
  }

  throw new Error(`Missing or invalid z-index token: ${token} on editor root`);
}
