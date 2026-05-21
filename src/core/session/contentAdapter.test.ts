import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { withTransactionGuard } from "@/capabilities/transactionGuard";

import { ContentAdapter } from "./contentAdapter";

const INCOMING_DOC = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "updated via ContentAdapter" }],
    },
  ],
};

const DummyInteraction = Extension.create({ name: "dummyInteraction" });

/** 与 buildExtensions interaction tier 一致：守卫读 isEditable ref，须与 editor.setEditable 同步 */
function createGuardedTestEditor(initialHtml = "<p>before</p>") {
  const isEditable = ref(true);
  const editor = new Editor({
    extensions: [
      withTransactionGuard(StarterKit, isEditable),
      withTransactionGuard(DummyInteraction, isEditable),
    ],
    content: initialHtml,
  });
  const setEditable = editor.setEditable.bind(editor);
  editor.setEditable = (value, emitUpdate) => {
    isEditable.value = value;
    return setEditable(value, emitUpdate);
  };
  return editor;
}

describe("ContentAdapter", () => {
  it("ContentAdapter.setContent 在 editor.setEditable(false) 后仍能写入", () => {
    const editor = createGuardedTestEditor();
    editor.setEditable(false);

    ContentAdapter.setContent(editor, INCOMING_DOC);

    expect(editor.getJSON()).toMatchObject(INCOMING_DOC);
    editor.destroy();
  });

  it("普通业务 commands 在 editable=false 下被守卫拦截", () => {
    const editor = createGuardedTestEditor();
    editor.setEditable(false);
    const before = editor.getJSON();

    editor.commands.setContent("<p>hi</p>");

    expect(editor.getJSON()).toEqual(before);
    editor.destroy();
  });
});
