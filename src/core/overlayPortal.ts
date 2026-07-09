/** Overlay portal DOM 约定（无 Vue 依赖，可供 TS 工具与非组件代码使用） */

export const OVERLAY_PORTAL_CLASS = "yaniv-editor__overlay-portal";

/** 从编辑器 DOM 树解析 overlay portal */
export function resolveOverlayPortal(editorRoot: HTMLElement): HTMLElement {
  const portal = editorRoot.querySelector(`.${OVERLAY_PORTAL_CLASS}`);
  if (!(portal instanceof HTMLElement)) {
    throw new Error(`Missing overlay portal (.${OVERLAY_PORTAL_CLASS}) on editor root`);
  }
  return portal;
}
