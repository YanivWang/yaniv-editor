import type { Editor } from "@tiptap/core";

/** 查找选区所在的 codeBlock 节点深度 */
export function findCodeBlockDepth(editor: Editor): number {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === "codeBlock") {
      return d;
    }
  }
  return -1;
}

/** 更新当前代码块语言（保证在块内选区时生效） */
export function updateCodeBlockLanguage(editor: Editor, language: string): boolean {
  const depth = findCodeBlockDepth(editor);
  if (depth < 0) return false;

  const { $from } = editor.state.selection;
  const pos = $from.before(depth);
  const node = $from.node(depth);

  return editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, language });
      return true;
    })
    .run();
}
