import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { describe, expect, test, afterEach } from "vitest";
import { ref } from "vue";

import { withTransactionGuard, BYPASS_GUARD_META } from "@/capabilities/transactionGuard";
import { ContentAdapter } from "@/core/session/contentAdapter";

describe("ContentAdapter", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  test("setContent 在 editor.setEditable(false) 后仍能写入", () => {
    const isEditable = ref(false);
    const guarded = withTransactionGuard(Extension.create({ name: "guardProbe" }), isEditable);

    editor = new Editor({
      extensions: [StarterKit, guarded],
      content: "<p>before</p>",
    });
    editor.setEditable(false);

    ContentAdapter.setContent(editor, {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "after" }] }],
    });

    expect(editor.getText()).toBe("after");
  });

  test("BYPASS_GUARD_META 是 Symbol", () => {
    expect(typeof BYPASS_GUARD_META).toBe("symbol");
  });
});
