/** Notion 风格块菜单（/、+、六点）共用定位逻辑 */

export const FLOATING_MENU_VIEWPORT_MARGIN = 8;
export const FLOATING_MENU_ANCHOR_OFFSET_X = 10;
/** 向上翻转时，菜单底边与锚点顶部的间距 */
export const FLOATING_MENU_FLIP_GAP = 24;

export interface FloatingMenuPositionInput {
  x: number;
  y: number;
  menuWidth: number;
  menuHeight: number;
  viewportWidth?: number;
  viewportHeight?: number;
  margin?: number;
  flipGap?: number;
}

export interface FloatingMenuPosition {
  x: number;
  y: number;
}

export function getBlockMenuAnchorPosition(
  anchorRect: DOMRect,
  blockTop: number,
): FloatingMenuPosition {
  return {
    x: anchorRect.right + FLOATING_MENU_ANCHOR_OFFSET_X,
    y: blockTop,
  };
}

/** 默认向下展开；视口下方空间不足时相对锚点向上翻转 */
export function resolveFloatingMenuPosition(
  input: FloatingMenuPositionInput,
): FloatingMenuPosition {
  const margin = input.margin ?? FLOATING_MENU_VIEWPORT_MARGIN;
  const flipGap = input.flipGap ?? FLOATING_MENU_FLIP_GAP;
  const viewportWidth = input.viewportWidth ?? window.innerWidth;
  const viewportHeight = input.viewportHeight ?? window.innerHeight;

  let { x, y } = input;
  const { menuWidth, menuHeight } = input;

  if (x + menuWidth + margin > viewportWidth) {
    x = viewportWidth - menuWidth - margin;
  }

  if (y + menuHeight + margin > viewportHeight) {
    y = y - menuHeight - flipGap;
  }

  return {
    x: Math.max(margin, x),
    y: Math.max(margin, y),
  };
}
