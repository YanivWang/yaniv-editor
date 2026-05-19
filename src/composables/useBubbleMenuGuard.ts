import { isBlockDragging } from "@/components/tools/drag-handle";

import type { Editor } from "@tiptap/core";

/** BubbleMenu shouldShow 的通用前置拦截：只读或块拖拽中不显示 */
export function isBubbleMenuBlocked(editor: Editor, readonly: boolean): boolean {
  if (readonly) return true;
  if (isBlockDragging(editor)) return true;
  return false;
}
