import { isBlockDragging } from "@/components/tools/drag-handle";

import type { Editor } from "@tiptap/core";

/** BubbleMenu shouldShow 的通用前置拦截：禁用态或块拖拽中不显示 */
export function isBubbleMenuBlocked(editor: Editor, disabled: boolean): boolean {
  if (disabled) return true;
  if (isBlockDragging(editor)) return true;
  return false;
}
