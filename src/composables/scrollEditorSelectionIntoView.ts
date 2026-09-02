import type { Editor } from "@tiptap/vue-3";

/**
 * 将当前选区滚入可视区域。
 *
 * 面向宿主的便利封装（经 `composables` barrel 进入包的公开 API），
 * 唯一作用是替调用方兜住 `null` / `undefined`。
 *
 * 库内部**没有**调用点：`searchReplace` 与 `OutlinePanel` 都直接调
 * `editor.commands.scrollIntoView()`——它们各自已有更强的前置守卫
 * （`isDestroyed`、导航开关），再套一层判空没有意义。
 */
export function scrollEditorSelectionIntoView(editor: Editor | null | undefined) {
  editor?.commands.scrollIntoView();
}
