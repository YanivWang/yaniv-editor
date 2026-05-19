import type { Editor } from "@tiptap/vue-3";

/**
 * Returns true while a block is being dragged via the drag handle.
 */
export function isBlockDragging(editor: Editor | null | undefined): boolean {
  if (!editor) return false;

  return editor.storage.dragHandle?.isDragging === true || editor.view.dragging != null;
}
