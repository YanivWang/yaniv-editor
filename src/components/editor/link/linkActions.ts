import type { Editor } from "@tiptap/core";

/** 写进文档的链接属性（与 `linkExtension` 的渲染属性各司其职） */
export function buildLinkAttrs(href: string) {
  return {
    href,
    target: "_blank",
    rel: "noopener noreferrer",
  };
}

/**
 * 该「替换整条已有链接」还是「插入一段新链接文本」。
 *
 * 光标停在已有链接里、又没有选区，正是**编辑这条链接**——按钮打开弹窗时
 * 也确实把当前 href 读进了输入框。只按 `selection.empty` 分流会漏掉这一半：
 * 实测原链接被从光标处劈成两半，中间塞进一段新链接文本
 * （`旧链接` → `旧链` + `https://new…` + `接`，三个 `<a>` 并排）。
 */
export function shouldReplaceExistingLink(editor: Editor): boolean {
  return !editor.state.selection.empty || editor.isActive("link");
}

/** 应用链接：按 {@link shouldReplaceExistingLink} 选择命令路径 */
export function applyLinkToEditor(editor: Editor, safeUrl: string): void {
  const chain = editor.chain().focus();

  if (shouldReplaceExistingLink(editor)) {
    chain.extendMarkRange("link").setLink(buildLinkAttrs(safeUrl)).run();
    return;
  }

  chain
    .insertContent([
      {
        type: "text",
        text: safeUrl,
        marks: [{ type: "link", attrs: buildLinkAttrs(safeUrl) }],
      },
    ])
    .run();
}
