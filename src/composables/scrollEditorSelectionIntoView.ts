import type { Editor } from "@tiptap/vue-3";

/**
 * 将当前选区滚入可视区域（封装 `scrollIntoView`，供查找命中锚点等横切场景复用）
 */
export function scrollEditorSelectionIntoView(editor: Editor | null | undefined) {
  editor?.commands.scrollIntoView();
}
