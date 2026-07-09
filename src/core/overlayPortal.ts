/** Overlay portal DOM 约定（无 Vue 依赖，可供 TS 工具与非组件代码使用） */

export const EDITOR_ROOT_CLASS = "yaniv-editor";
export const OVERLAY_PORTAL_CLASS = "yaniv-editor__overlay-portal";

/** 从编辑器根节点解析 overlay portal */
export function resolveOverlayPortal(editorRoot: HTMLElement): HTMLElement {
  const portal = editorRoot.querySelector(`.${OVERLAY_PORTAL_CLASS}`);
  if (!(portal instanceof HTMLElement)) {
    throw new Error(`Missing overlay portal (.${OVERLAY_PORTAL_CLASS}) on editor root`);
  }
  return portal;
}

/** 从任意编辑器内 DOM 节点向上查找根并解析 overlay portal */
export function resolveOverlayPortalFromNode(node: Element | null | undefined): HTMLElement {
  const root = node?.closest(`.${EDITOR_ROOT_CLASS}`);
  if (!(root instanceof HTMLElement)) {
    throw new Error(`Cannot resolve overlay portal: missing .${EDITOR_ROOT_CLASS} ancestor`);
  }
  return resolveOverlayPortal(root);
}

/** 从编辑器内 DOM 节点解析编辑器根 */
export function resolveEditorRootFromNode(node: Element | null | undefined): HTMLElement {
  const root = node?.closest(`.${EDITOR_ROOT_CLASS}`);
  if (!(root instanceof HTMLElement)) {
    throw new Error(`Cannot resolve editor root: missing .${EDITOR_ROOT_CLASS} ancestor`);
  }
  return root;
}
