import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, test } from "vitest";

import { Callout } from "@/extensions/callout";

import { applyBlockTransform } from "./blockMenuActions";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("applyBlockTransform", () => {
  test("callout transform preserves the current block content", () => {
    editor = new Editor({
      extensions: [StarterKit, Callout],
      content: "<p>Keep me</p>",
    });

    editor.commands.setTextSelection(2);
    applyBlockTransform(editor, "callout");

    expect(editor.getText()).toContain("Keep me");
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "callout",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Keep me" }],
        },
      ],
    });
  });
});
